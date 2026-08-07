import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

/**
 * Volunteer retention by program area: for each of the last N months,
 * what percentage of volunteers who were active the previous month were
 * still active (had at least one non-cancelled booking) this month.
 */
export async function getRetentionByProgramArea(months = 6) {
  const programAreas = await prisma.programArea.findMany();
  const now = new Date();
  const buckets = Array.from({ length: months }).map((_, i) => {
    const monthsAgo = months - 1 - i;
    const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
    return { label: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), start, end };
  });

  const results = [];
  for (const area of programAreas) {
    const monthly: { month: string; retentionRate: number; activeVolunteers: number }[] = [];
    let previousActive: Set<string> | null = null;

    for (const bucket of buckets) {
      const bookings = await prisma.shiftBooking.findMany({
        where: {
          status: { in: ["CONFIRMED", "WAITLISTED"] },
          shift: { programAreaId: area.id, startTime: { gte: bucket.start, lt: bucket.end } },
        },
        select: { volunteerId: true },
      });
      const activeThisMonth = new Set(bookings.map((b) => b.volunteerId));

      let retentionRate = 0;
      if (previousActive && previousActive.size > 0) {
        const retained = [...previousActive].filter((id) => activeThisMonth.has(id)).length;
        retentionRate = Math.round((retained / previousActive.size) * 1000) / 10;
      }

      monthly.push({
        month: bucket.label,
        retentionRate,
        activeVolunteers: activeThisMonth.size,
      });
      previousActive = activeThisMonth;
    }

    results.push({ programArea: area.name, monthly });
  }

  return results;
}

/** No-show rate (no-shows / (attended + no-show)) by program area. */
export async function getNoShowRateByProgramArea() {
  const grouped = await prisma.attendanceLog.groupBy({
    by: ["programAreaName", "status"],
    _count: { _all: true },
    where: { status: { in: [AttendanceStatus.ATTENDED, AttendanceStatus.NO_SHOW] } },
  });

  const byArea = new Map<string, { attended: number; noShow: number }>();
  for (const row of grouped) {
    const entry = byArea.get(row.programAreaName) ?? { attended: 0, noShow: 0 };
    if (row.status === AttendanceStatus.ATTENDED) entry.attended += row._count._all;
    if (row.status === AttendanceStatus.NO_SHOW) entry.noShow += row._count._all;
    byArea.set(row.programAreaName, entry);
  }

  return [...byArea.entries()].map(([programArea, { attended, noShow }]) => {
    const total = attended + noShow;
    return {
      programArea,
      attended,
      noShow,
      totalScheduled: total,
      noShowRate: total > 0 ? Math.round((noShow / total) * 1000) / 10 : 0,
    };
  });
}

/** Full grant-compliance export: every attendance record with clearance snapshot. */
export async function getComplianceLog(filters: {
  programArea?: string;
  from?: Date;
  to?: Date;
}) {
  return prisma.attendanceLog.findMany({
    where: {
      programAreaName: filters.programArea,
      shiftStartTime: {
        gte: filters.from,
        lte: filters.to,
      },
    },
    include: {
      volunteer: { select: { firstName: true, lastName: true, email: true } },
      shiftBooking: { include: { shift: true } },
    },
    orderBy: { shiftStartTime: "desc" },
  });
}
