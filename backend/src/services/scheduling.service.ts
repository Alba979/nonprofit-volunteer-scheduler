import { AttendanceStatus, BookingStatus, SmsType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ApiError } from "../types";
import { evaluateClearance, describeClearanceSnapshot } from "./clearance.service";
import { sendSms, smsTemplates } from "./sms.service";

export interface BookShiftResult {
  status: "CONFIRMED" | "WAITLISTED" | "REDIRECTED";
  booking?: Awaited<ReturnType<typeof prisma.shiftBooking.create>>;
  redirectUrl?: string;
  message: string;
}

/**
 * Attempts to book a volunteer onto a shift.
 *
 * Restricted shifts (requiresBackgroundCheck = true) are gated by
 * evaluateClearance(): if the volunteer has no CLEARED, non-expired check on
 * file, the booking is refused and the volunteer is redirected to the
 * background-check request flow instead of being silently blocked.
 */
export async function bookShift(volunteerId: string, shiftId: string): Promise<BookShiftResult> {
  const [shift, volunteer, existing] = await Promise.all([
    prisma.shift.findUnique({ where: { id: shiftId } }),
    prisma.volunteer.findUnique({ where: { id: volunteerId } }),
    prisma.shiftBooking.findUnique({
      where: { shiftId_volunteerId: { shiftId, volunteerId } },
    }),
  ]);

  if (!shift) throw new ApiError(404, "Shift not found");
  if (!volunteer) throw new ApiError(404, "Volunteer not found");
  if (existing && existing.status !== BookingStatus.CANCELLED) {
    throw new ApiError(409, "Volunteer already has an active booking for this shift");
  }

  if (shift.requiresBackgroundCheck) {
    const clearance = await evaluateClearance(volunteerId);
    if (!clearance.cleared) {
      await prisma.shiftBooking.upsert({
        where: { shiftId_volunteerId: { shiftId, volunteerId } },
        create: { shiftId, volunteerId, status: BookingStatus.REDIRECTED },
        update: { status: BookingStatus.REDIRECTED, cancelledAt: null, cancelReason: null },
      });

      await sendSms({
        volunteerId,
        phone: volunteer.phone,
        type: SmsType.BACKGROUND_CHECK_REDIRECT,
        body: smsTemplates.backgroundCheckRedirect(volunteer.firstName, shift.title),
      });

      return {
        status: "REDIRECTED",
        redirectUrl: `/background-checks/request?volunteerId=${volunteerId}`,
        message: `This shift requires a background check: ${clearance.reason}. ` +
          `You've been redirected to start the clearance request.`,
      };
    }
  }

  const confirmedCount = await prisma.shiftBooking.count({
    where: { shiftId, status: BookingStatus.CONFIRMED },
  });
  const status = confirmedCount < shift.capacity ? BookingStatus.CONFIRMED : BookingStatus.WAITLISTED;

  const booking = await prisma.shiftBooking.upsert({
    where: { shiftId_volunteerId: { shiftId, volunteerId } },
    create: { shiftId, volunteerId, status },
    update: { status, cancelledAt: null, cancelReason: null, bookedAt: new Date() },
  });

  return {
    status: status === BookingStatus.CONFIRMED ? "CONFIRMED" : "WAITLISTED",
    booking,
    message:
      status === BookingStatus.CONFIRMED
        ? "Shift confirmed."
        : "Shift is at capacity — volunteer has been waitlisted.",
  };
}

/**
 * Cancels a booking. If the cancellation happens inside the "last-minute"
 * window (default 24h before shift start), the volunteer receives a
 * cancellation-confirmation text and the system texts the best available
 * replacement candidates from the same program area.
 */
export async function cancelBooking(bookingId: string, reason?: string) {
  const booking = await prisma.shiftBooking.findUnique({
    where: { id: bookingId },
    include: { shift: true, volunteer: true },
  });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status === BookingStatus.CANCELLED) {
    throw new ApiError(409, "Booking is already cancelled");
  }

  const hoursUntilShift = (booking.shift.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  const isLastMinute = hoursUntilShift <= config.lastMinuteCancellationWindowHours;

  const updated = await prisma.shiftBooking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason ?? null,
      isLastMinute,
    },
  });

  // A cancelled CONFIRMED seat should be logged as EXCUSED, not silently
  // dropped, so grant reporting still accounts for the shift.
  await prisma.attendanceLog.updateMany({
    where: { shiftBookingId: bookingId },
    data: { status: AttendanceStatus.EXCUSED },
  });

  if (isLastMinute) {
    await sendSms({
      volunteerId: booking.volunteerId,
      phone: booking.volunteer.phone,
      type: SmsType.CANCELLATION_CONFIRMATION,
      body: smsTemplates.cancellationConfirmation(booking.volunteer.firstName, booking.shift.title),
    });
    await requestReplacements(booking.shiftId);
  }

  // Promote the longest-waiting waitlisted volunteer into the open seat, if any.
  await promoteFromWaitlist(booking.shiftId);

  return updated;
}

async function promoteFromWaitlist(shiftId: string) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return;

  const confirmedCount = await prisma.shiftBooking.count({
    where: { shiftId, status: BookingStatus.CONFIRMED },
  });
  if (confirmedCount >= shift.capacity) return;

  const nextInLine = await prisma.shiftBooking.findFirst({
    where: { shiftId, status: BookingStatus.WAITLISTED },
    orderBy: { bookedAt: "asc" },
  });
  if (!nextInLine) return;

  await prisma.shiftBooking.update({
    where: { id: nextInLine.id },
    data: { status: BookingStatus.CONFIRMED },
  });
}

/**
 * Texts up to 5 volunteers from the shift's program area who are not
 * already booked (and, for restricted shifts, are currently cleared) asking
 * them to cover the newly-open seat.
 */
export async function requestReplacements(shiftId: string, limit = 5) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { programArea: true },
  });
  if (!shift) throw new ApiError(404, "Shift not found");

  const alreadyBooked = await prisma.shiftBooking.findMany({
    where: { shiftId, status: { in: [BookingStatus.CONFIRMED, BookingStatus.WAITLISTED] } },
    select: { volunteerId: true },
  });
  const excludeIds = new Set(alreadyBooked.map((b) => b.volunteerId));

  const candidates = await prisma.volunteer.findMany({
    where: {
      active: true,
      programAreaId: shift.programAreaId,
      id: { notIn: [...excludeIds] },
    },
    take: 25, // pull extra so we can filter unclearanced volunteers below
  });

  const notified: string[] = [];
  for (const candidate of candidates) {
    if (notified.length >= limit) break;

    if (shift.requiresBackgroundCheck) {
      const clearance = await evaluateClearance(candidate.id);
      if (!clearance.cleared) continue;
    }

    await sendSms({
      volunteerId: candidate.id,
      phone: candidate.phone,
      type: SmsType.REPLACEMENT_REQUEST,
      body: smsTemplates.replacementRequest(shift.title, shift.startTime, shift.location),
    });
    notified.push(candidate.id);
  }

  return { notifiedVolunteerIds: notified };
}

/**
 * Writes (or upserts) the permanent, grant-compliance attendance record for
 * a booking, capturing a point-in-time snapshot of the volunteer's
 * clearance status. This log is append-only in spirit — callers should
 * never delete rows, only add corrections as new entries if ever needed.
 */
export async function logAttendance(bookingId: string, status: AttendanceStatus, loggedBy = "system") {
  const booking = await prisma.shiftBooking.findUnique({
    where: { id: bookingId },
    include: { shift: { include: { programArea: true } }, volunteer: true },
  });
  if (!booking) throw new ApiError(404, "Booking not found");

  const clearance = await evaluateClearance(booking.volunteerId);
  const snapshot = describeClearanceSnapshot(clearance, booking.shift.requiresBackgroundCheck);

  return prisma.attendanceLog.upsert({
    where: { shiftBookingId: bookingId },
    create: {
      shiftBookingId: bookingId,
      volunteerId: booking.volunteerId,
      status,
      clearanceStatusAtShift: snapshot,
      programAreaName: booking.shift.programArea.name,
      shiftStartTime: booking.shift.startTime,
      loggedBy,
    },
    update: { status, loggedBy, loggedAt: new Date() },
  });
}
