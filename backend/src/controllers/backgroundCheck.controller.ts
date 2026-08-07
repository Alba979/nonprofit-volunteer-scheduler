import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../types";
import { evaluateClearance } from "../services/clearance.service";

export async function listForVolunteer(req: Request, res: Response) {
  const checks = await prisma.backgroundCheck.findMany({
    where: { volunteerId: req.params.volunteerId },
    orderBy: { requestedAt: "desc" },
  });
  res.json(checks);
}

/** Kicks off (or re-requests) a background check for a volunteer. */
export async function requestCheck(req: Request, res: Response) {
  const { volunteerId, provider } = req.body;
  const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
  if (!volunteer) throw new ApiError(404, "Volunteer not found");

  const check = await prisma.backgroundCheck.create({
    data: {
      volunteerId,
      provider: provider ?? "Checkr",
      referenceNumber: `REQ-${Date.now().toString(36).toUpperCase()}`,
      status: "PENDING",
    },
  });
  res.status(201).json(check);
}

/** Coordinator/admin action: record the outcome of a completed check. */
export async function resolveCheck(req: Request, res: Response) {
  const { status, issuedAt, expiresAt, notes } = req.body;
  const check = await prisma.backgroundCheck.update({
    where: { id: req.params.id },
    data: {
      status,
      issuedAt: issuedAt ? new Date(issuedAt) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notes,
    },
  });

  // If the check just cleared, any bookings this volunteer was REDIRECTED
  // from can now be retried by the volunteer from the UI.
  res.json(check);
}

export async function clearanceStatus(req: Request, res: Response) {
  const result = await evaluateClearance(req.params.volunteerId);
  res.json(result);
}

/** Checks on file expiring within `days` (default 30) — for coordinator follow-up. */
export async function listExpiringSoon(req: Request, res: Response) {
  const days = Number(req.query.days ?? 30);
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const checks = await prisma.backgroundCheck.findMany({
    where: { status: "CLEARED", expiresAt: { lte: cutoff, gte: new Date() } },
    include: { volunteer: true },
    orderBy: { expiresAt: "asc" },
  });
  res.json(checks);
}
