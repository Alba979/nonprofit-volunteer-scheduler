import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import type { BackgroundCheck, Volunteer } from "../types";

export default function BackgroundChecks() {
  const [searchParams] = useSearchParams();
  const volunteerId = searchParams.get("volunteerId") ?? "";
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [selected, setSelected] = useState(volunteerId);
  const [checks, setChecks] = useState<BackgroundCheck[]>([]);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    api.get("/volunteers").then((res) => setVolunteers(res.data));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/background-checks/volunteer/${selected}`).then((res) => setChecks(res.data));
  }, [selected]);

  async function requestCheck() {
    if (!selected) return;
    setRequesting(true);
    try {
      await api.post("/background-checks/request", { volunteerId: selected });
      const res = await api.get(`/background-checks/volunteer/${selected}`);
      setChecks(res.data);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Background Checks</h1>
        <p className="text-slate-500 text-sm">
          Volunteers redirected from a restricted shift land here to start a clearance request.
        </p>
      </div>

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm w-full sm:w-80"
      >
        <option value="">Select a volunteer</option>
        {volunteers.map((v) => (
          <option key={v.id} value={v.id}>
            {v.firstName} {v.lastName}
          </option>
        ))}
      </select>

      {selected && (
        <>
          <button
            onClick={requestCheck}
            disabled={requesting}
            className="self-start bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            {requesting ? "Requesting..." : "Request new background check"}
          </button>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Reference</th>
                  <th className="px-4 py-2 font-medium">Provider</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Requested</th>
                  <th className="px-4 py-2 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checks.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2">{c.referenceNumber}</td>
                    <td className="px-4 py-2">{c.provider}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-2">{new Date(c.requestedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
                {checks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No background checks on file yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
