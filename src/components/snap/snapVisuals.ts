import type { Rarity } from "@/types";

/** Rarity → frame color for SNAP card tiles. */
export const snapRarityFrame: Record<Rarity, string> = {
  Common: "ring-zinc-400/40",
  Rare: "ring-sky-400/60",
  Epic: "ring-fuchsia-400/70",
  Legendary: "ring-amber-300/80",
};

export const snapRarityGradient: Record<Rarity, string> = {
  Common: "from-zinc-700/70 to-zinc-900/90",
  Rare: "from-sky-600/60 to-indigo-900/80",
  Epic: "from-fuchsia-600/55 to-purple-950/85",
  Legendary: "from-amber-500/55 to-orange-900/85",
};

export const snapRarityGlow: Record<Rarity, string> = {
  Common: "glow-common",
  Rare: "glow-rare",
  Epic: "glow-epic",
  Legendary: "glow-legendary",
};

export function snapInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
