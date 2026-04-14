interface PulseRiskBadgeProps {
  label: string;
  tone: "safe" | "suspicious" | "risky";
}

export default function PulseRiskBadge({ label, tone }: PulseRiskBadgeProps) {
  const toneClass =
    tone === "safe"
      ? "bg-success/15 text-success border-success/30"
      : tone === "suspicious"
        ? "bg-accent/15 text-accent border-accent/30"
        : "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${toneClass}`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-current" />
      </span>
      {label}
    </span>
  );
}
