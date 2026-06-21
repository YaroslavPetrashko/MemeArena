import { cn } from "@/lib/utils/cn";
import type { Rarity } from "@/types";

const rarityStyles: Record<Rarity, string> = {
  Common: "text-[var(--rarity-common)] border-[var(--rarity-common)]/40 bg-white/5",
  Rare: "text-[var(--rarity-rare)] border-[var(--rarity-rare)]/40 bg-[var(--rarity-rare)]/10",
  Epic: "text-[var(--rarity-epic)] border-[var(--rarity-epic)]/40 bg-[var(--rarity-epic)]/10",
  Legendary: "text-[var(--rarity-legendary)] border-[var(--rarity-legendary)]/50 bg-[var(--rarity-legendary)]/10",
};

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        rarityStyles[rarity],
        className,
      )}
    >
      {rarity}
    </span>
  );
}

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "lime" | "magenta" | "gold" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/8 text-muted border-white/10",
    lime: "bg-lime/15 text-lime border-lime/30",
    magenta: "bg-magenta/15 text-magenta border-magenta/30",
    gold: "bg-gold/15 text-gold border-gold/30",
    danger: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
