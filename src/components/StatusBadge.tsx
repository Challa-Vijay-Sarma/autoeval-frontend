type Props = { status: string };

const COLORS: Record<string, string> = {
  queued: "bg-slate-200 text-slate-800",
  pending: "bg-slate-200 text-slate-800",
  running: "bg-blue-100 text-blue-800",
  pausing: "bg-amber-100 text-amber-800",
  paused: "bg-slate-300 text-slate-900",
  done: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
  error: "bg-rose-100 text-rose-800",
};

export default function StatusBadge({ status }: Props) {
  const cls = COLORS[status] || "bg-slate-200 text-slate-800";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
