import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../types";
import * as scheduling from "../services/scheduling.service";

export async function listShifts(req: Request, res: Response) {
  const { programAreaId, from, to } = req.query;
  const shifts = await prisma.shift.findMany({
    where: {
      programAreaId: programAreaId ? String(programAreaId) : undefined,
      startTime: {
        gte: from ? new Date(String(from)) : undefined,
        lte: to ? new Date(String(to)) : undefined,
      },
    },
    include: {
      programArea: true,
      bookings: { where: { status: { in: ["CONFIRMED", "WAITLISTED"] } } },
    },
    orderBy: { startTime: "asc" },
  });

  res.json(
    shifts.map((s) => ({
      ...s,
      confirmedCount: s.bookings.filter((b) => b.status === "CONFIRMED").length,
      waitlistedCount: s.bookings.filter((b) => b.status === "WAITLISTED").length,
      bookings: undefined,
    }))
  );
}

export async function getShift(req: Request, res: Response) {
  const shift = await prisma.shift.findUnique({
    where: { id: req.params.id },
    include: {
      programArea: true,
      bookings: { include: { volunteer: true, attendance: true } },
    },
  });
  if (!shift) throw new ApiError(404, "Shift not found");
  res.json(shift);
}

export async function createShift(req: Request, res: Response) {
  const { title, description, programAreaId, location, startTime, endTime, capacity, requiresBackgroundCheck } =
    req.body;
  const shift = await prisma.shift.create({
    data: {
      title,
      description,
      programAreaId,
      location,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      capacity,
      requiresBackgroundCheck: Boolean(requiresBackgroundCheck),
    },
  });
  res.status(201).json(shift);
}

export async function bookShiftHandler(req: Request, res: Response) {
  const { volunteerId } = req.body;
  const result = await scheduling.bookShift(volunteerId, req.params.id);
  const statusCode = result.status === "REDIRECTED" ? 403 : 201;
  res.status(statusCode).json(result);
}

export async function cancelBookingHandler(req: Request, res: Response) {
  const { reason } = req.body;
  const booking = await scheduling.cancelBooking(req.params.bookingId, reason);
  res.json(booking);
}

export async function logAttendanceHandler(req: Request, res: Response) {
  const { status } = req.body;
  const loggedBy = req.user?.email ?? "system";
  const log = await scheduling.logAttendance(req.params.bookingId, status, loggedBy);
  res.json(log);
}

export async function requestReplacementsHandler(req: Request, res: Response) {
  const result = await scheduling.requestReplacements(req.params.id);
  res.json(result);
}
