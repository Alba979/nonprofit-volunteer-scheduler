const styles: Record<string, string> = {
  CLEARED: "bg-emerald-100 text-emerald-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  ATTENDED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  WAITLISTED: "bg-amber-100 text-amber-700",
  EXPIRED: "bg-rose-100 text-rose-700",
  NO_SHOW: "bg-rose-100 text-rose-700",
  REJECTED: "bg-rose-100 text-rose-700",
  REDIRECTED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  EXCUSED: "bg-slate-100 text-slate-600",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
