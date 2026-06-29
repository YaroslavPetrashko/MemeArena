import { cn } from "@/lib/utils/cn";
import { rankForRp, rankLabel, type Rank } from "@/data/ranks";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1",
  md: "text-xs px-2 py-1 gap-1.5",
  lg: "text-sm px-3 py-1.5 gap-2",
};

/**
 * Competitive rank chip — tier icon + name + division, tinted by the tier color.
 * Pass either a resolved `rank` or raw `rp`.
 */
export function RankBadge({
  rank,
  rp,
  size = "md",
  showRp,
  className,
}: {
  rank?: Rank;
  rp?: number;
  size?: Size;
  showRp?: boolean;
  className?: string;
}) {
  const r = rank ?? rankForRp(rp ?? 0);
  return (
    <span
      className={cn("inline-flex items-center rounded-full border font-display font-bold", SIZES[size], className)}
      style={{
        color: r.color,
        borderColor: `${r.color}66`,
        backgroundColor: `${r.color}1f`,
      }}
      title={`${rankLabel(r)} · ${r.rp} RP`}
    >
      <span aria-hidden>{r.icon}</span>
      {rankLabel(r)}
      {showRp && <span className="opacity-70">· {r.rp} RP</span>}
    </span>
  );
}
