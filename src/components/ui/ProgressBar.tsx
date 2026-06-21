import { cn } from "@/lib/utils/cn";

export function ProgressBar({
  value,
  max,
  className,
  barClassName,
  showShield,
  shield = 0,
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
  showShield?: boolean;
  shield?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const shieldPct = Math.max(0, Math.min(100, (shield / max) * 100));
  return (
    <div className={cn("relative h-3 w-full overflow-hidden rounded-full bg-black/50 border border-white/10", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", barClassName ?? "bg-gradient-to-r from-lime to-emerald-400")}
        style={{ width: `${pct}%` }}
      />
      {showShield && shield > 0 && (
        <div
          className="absolute top-0 h-full bg-sky-400/70 transition-all duration-300"
          style={{ left: `${pct}%`, width: `${Math.min(shieldPct, 100 - pct)}%` }}
        />
      )}
    </div>
  );
}
