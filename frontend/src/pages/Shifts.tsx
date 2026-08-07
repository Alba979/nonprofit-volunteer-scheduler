import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import ShiftCard from "../components/ShiftCard";
import type { Shift, ProgramArea, BookShiftResponse } from "../types";

export default function Shifts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [programAreas, setProgramAreas] = useState<ProgramArea[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "warn"; text: string } | null>(null);

  function loadShifts() {
    api.get("/shifts", { params: { programAreaId: filter || undefined, from: new Date().toISOString() } })
      .then((res) => setShifts(res.data));
  }

  useEffect(() => {
    api.get("/program-areas").then((res) => setProgramAreas(res.data));
  }, []);

  useEffect(() => {
    loadShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleBook(shift: Shift) {
    if (!user?.volunteerId) {
      setNotice({ tone: "warn", text: "Sign in with a volunteer account to book shifts." });
      return;
    }
    setBookingId(shift.id);
    try {
      const { data } = await api.post<BookShiftResponse>(`/shifts/${shift.id}/book`, {
        volunteerId: user.volunteerId,
      });
      if (data.status === "REDIRECTED") {
        setNotice({ tone: "warn", text: data.message });
        setTimeout(() => navigate(`/background-checks?volunteerId=${user.volunteerId}`), 1500);
      } else {
        setNotice({ tone: "success", text: data.message });
        loadShifts();
      }
    } finally {
      setBookingId(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upcoming Shifts</h1>
          <p className="text-slate-500 text-sm">
            Shifts marked "Background check required" will redirect you to the clearance request flow if you're not cleared.
          </p>
        </div>
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

      {notice && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            notice.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.map((shift) => (
          <ShiftCard key={shift.id} shift={shift} onBook={handleBook} booking={bookingId === shift.id} />
        ))}
        {shifts.length === 0 && <p className="text-slate-400 text-sm">No upcoming shifts for this filter.</p>}
      </div>
    </div>
  );
}
