import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import * as reporting from "../services/reporting.service";

export async function retentionReport(req: Request, res: Response) {
  const months = Number(req.query.months ?? 6);
  const data = await reporting.getRetentionByProgramArea(months);
  res.json(data);
}

export async function noShowReport(_req: Request, res: Response) {
  const data = await reporting.getNoShowRateByProgramArea();
  res.json(data);
}

export async function complianceExport(req: Request, res: Response) {
  const { programArea, from, to } = req.query;
  const data = await reporting.getComplianceLog({
    programArea: programArea ? String(programArea) : undefined,
    from: from ? new Date(String(from)) : undefined,
    to: to ? new Date(String(to)) : undefined,
  });
  res.json(data);
}

export async function dashboardSummary(_req: Request, res: Response) {
  const [upcomingShifts, activeVolunteers, pendingChecks, expiringChecks] = await Promise.all([
    prisma.shift.count({ where: { startTime: { gte: new Date() } } }),
    prisma.volunteer.count({ where: { active: true } }),
    prisma.backgroundCheck.count({ where: { status: "PENDING" } }),
    prisma.backgroundCheck.count({
      where: {
        status: "CLEARED",
        expiresAt: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() },
      },
    }),
  ]);

  res.json({ upcomingShifts, activeVolunteers, pendingChecks, expiringChecks });
}
