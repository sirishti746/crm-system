export const STATUS_META = {
  Open: { dot: "bg-accent", pill: "bg-accent/10 text-accent", rail: "bg-accent" },
  "In Progress": { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700", rail: "bg-amber-500" },
  Closed: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700", rail: "bg-emerald-500" },
};

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {status}
    </span>
  );
}