import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { DashboardSummary, BackgroundCheck } from "../types";

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" }) {
  const toneClass = tone === "danger" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : "text-brand-700";
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expiring, setExpiring] = useState<(BackgroundCheck & { volunteer: { firstName: string; lastName: string } })[]>([]);

  useEffect(() => {
    api.get("/reports/dashboard").then((res) => setSummary(res.data));
    api.get("/background-checks/expiring-soon?days=30").then((res) => setExpiring(res.data)).catch(() => setExpiring([]));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Coordinator Dashboard</h1>
        <p className="text-slate-500 text-sm">A snapshot of upcoming shifts, active volunteers, and compliance status.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Upcoming shifts" value={summary?.upcomingShifts ?? 0} />
        <StatCard label="Active volunteers" value={summary?.activeVolunteers ?? 0} />
        <StatCard label="Pending background checks" value={summary?.pendingChecks ?? 0} tone="warn" />
        <StatCard label="Clearances expiring in 30 days" value={summary?.expiringChecks ?? 0} tone="danger" />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-3">Clearances expiring soon</h2>
        {expiring.length === 0 ? (
          <p className="text-sm text-slate-400">No background checks are expiring in the next 30 days.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {expiring.map((check) => (
              <li key={check.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  {check.volunteer.firstName} {check.volunteer.lastName}
                </span>
                <span className="text-amber-600 font-medium">
                  expires {check.expiresAt ? new Date(check.expiresAt).toLocaleDateString() : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
