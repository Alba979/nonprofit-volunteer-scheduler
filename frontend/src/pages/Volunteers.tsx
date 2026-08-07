import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Volunteer, ProgramArea } from "../types";

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [programAreas, setProgramAreas] = useState<ProgramArea[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api.get("/program-areas").then((res) => setProgramAreas(res.data));
  }, []);

  useEffect(() => {
    api.get("/volunteers", { params: { programAreaId: filter || undefined } }).then((res) => setVolunteers(res.data));
  }, [filter]);

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Volunteers</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All program areas</option>
          {programAreas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Program area</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {volunteers.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/background-checks?volunteerId=${v.id}`} className="text-brand-700 hover:underline">
                    {v.firstName} {v.lastName}
                  </Link>
                </td>
                <td className="px-4 py-2">{v.programArea?.name ?? "—"}</td>
                <td className="px-4 py-2">{v.phone}</td>
                <td className="px-4 py-2">{v.active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
