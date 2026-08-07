import type { Shift } from "../types";

interface Props {
  shift: Shift;
  onBook?: (shift: Shift) => void;
  booking?: boolean;
}

export default function ShiftCard({ shift, onBook, booking }: Props) {
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);
  const isFull = (shift.confirmedCount ?? 0) >= shift.capacity;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{shift.title}</h3>
          <p className="text-sm text-slate-500">{shift.programArea?.name}</p>
        </div>
        {shift.requiresBackgroundCheck && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 whitespace-nowrap">
            Background check required
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600">
        {start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ·{" "}
        {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}–
        {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </p>
      <p className="text-sm text-slate-500">{shift.location}</p>
      <p className="text-xs text-slate-400">
        {shift.confirmedCount ?? 0}/{shift.capacity} confirmed
        {shift.waitlistedCount ? ` · ${shift.waitlistedCount} waitlisted` : ""}
      </p>
      {onBook && (
        <button
          onClick={() => onBook(shift)}
          disabled={booking}
          className="mt-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-md"
        >
          {booking ? "Booking..." : isFull ? "Join waitlist" : "Sign up"}
        </button>
      )}
    </div>
  );
}
