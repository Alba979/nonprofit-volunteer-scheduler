import { useEffect, useState } from "react";
import { api } from "../api/client";
import RetentionChart from "../components/RetentionChart";
import NoShowChart from "../components/NoShowChart";
import type { RetentionSeries, NoShowRow } from "../types";

export default function Reports() {
  const [retention, setRetention] = useState<RetentionSeries[]>([]);
  const [noShow, setNoShow] = useState<NoShowRow[]>([]);

  useEffect(() => {
    api.get("/reports/retention", { params: { months: 6 } }).then((res) => setRetention(res.data));
    api.get("/reports/no-show-rate").then((res) => setNoShow(res.data));
  }, []);

  async function downloadComplianceExport() {
    const res = await api.get("/reports/compliance-export");
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compliance-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm">Retention, no-show rate, and grant-compliance attendance export.</p>
        </div>
        <button
          onClick={downloadComplianceExport}
          className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          Export compliance log
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-1">Volunteer retention by program area</h2>
        <p className="text-xs text-slate-400 mb-3">
          % of active volunteers from the prior month who were active again this month.
        </p>
        <RetentionChart series={retention} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-1">No-show rate by program area</h2>
        <p className="text-xs text-slate-400 mb-3">Share of confirmed bookings where the volunteer did not show up.</p>
        <NoShowChart rows={noShow} />
      </div>
    </div>
  );
}
