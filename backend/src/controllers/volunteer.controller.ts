import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../types";
import { evaluateClearance } from "../services/clearance.service";

export async function listVolunteers(req: Request, res: Response) {
  const { programAreaId, active } = req.query;
  const volunteers = await prisma.volunteer.findMany({
    where: {
      programAreaId: programAreaId ? String(programAreaId) : undefined,
      active: active !== undefined ? active === "true" : undefined,
    },
    include: { programArea: true },
    orderBy: { lastName: "asc" },
  });
  res.json(volunteers);
}

export async function getVolunteer(req: Request, res: Response) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { id: req.params.id },
    include: {
      programArea: true,
      backgroundChecks: { orderBy: { requestedAt: "desc" } },
      bookings: { include: { shift: true }, orderBy: { bookedAt: "desc" }, take: 20 },
    },
  });
  if (!volunteer) throw new ApiError(404, "Volunteer not found");

  const clearance = await evaluateClearance(volunteer.id);
  res.json({ ...volunteer, clearance });
}

export async function createVolunteer(req: Request, res: Response) {
  const { firstName, lastName, email, phone, programAreaId } = req.body;
  const volunteer = await prisma.volunteer.create({
    data: { firstName, lastName, email, phone, programAreaId },
  });
  res.status(201).json(volunteer);
}

export async function updateVolunteer(req: Request, res: Response) {
  const { firstName, lastName, phone, programAreaId, active } = req.body;
  const volunteer = await prisma.volunteer.update({
    where: { id: req.params.id },
    data: { firstName, lastName, phone, programAreaId, active },
  });
  res.json(volunteer);
}
