import cron from "node-cron";
import { BookingStatus, SmsType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { sendSms, smsTemplates } from "../services/sms.service";
import { logger } from "../utils/logger";

/**
 * Every 15 minutes, finds confirmed bookings for shifts starting within the
 * configured reminder window (default 24h) that haven't been reminded yet,
 * and texts each volunteer. `reminderSentAt` on the shift prevents duplicate
 * texts across runs.
 */
export async function runShiftReminderSweep() {
  const windowStart = new Date();
  const windowEnd = new Date(Date.now() + config.reminderHoursBefore * 60 * 60 * 1000);

  const dueShifts = await prisma.shift.findMany({
    where: {
      startTime: { gte: windowStart, lte: windowEnd },
      reminderSentAt: null,
    },
    include: {
      bookings: {
        where: { status: BookingStatus.CONFIRMED },
        include: { volunteer: true },
      },
    },
  });

  let remindersSent = 0;
  for (const shift of dueShifts) {
    for (const booking of shift.bookings) {
      await sendSms({
        volunteerId: booking.volunteerId,
        phone: booking.volunteer.phone,
        type: SmsType.SHIFT_REMINDER,
        body: smsTemplates.shiftReminder(
          booking.volunteer.firstName,
          shift.title,
          shift.startTime,
          shift.location
        ),
      });
      remindersSent += 1;
    }
    await prisma.shift.update({ where: { id: shift.id }, data: { reminderSentAt: new Date() } });
  }

  if (remindersSent > 0) {
    logger.info({ remindersSent, shifts: dueShifts.length }, "Shift reminder sweep complete");
  }
  return { shiftsProcessed: dueShifts.length, remindersSent };
}

export function scheduleReminderJob() {
  // Runs at :00, :15, :30, :45 past every hour.
  cron.schedule("*/15 * * * *", () => {
    runShiftReminderSweep().catch((err) => logger.error({ err }, "Reminder sweep failed"));
  });
  logger.info("Shift reminder job scheduled (every 15 minutes)");
}
