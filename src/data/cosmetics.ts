import type { CosmeticFrame } from "@/types";

/**
 * Cosmetic card frames. Purely visual — bought with Gems and applied to owned
 * cards. Unlock gated by player level 4+ (see UNLOCKS_BY_LEVEL).
 */
export const COSMETIC_FRAMES: CosmeticFrame[] = [
  {
    id: "frame_default",
    name: "Standard",
    rarity: "Common",
    cost_gems: 0,
    style_config: { gradient: "from-zinc-700 to-zinc-900", glow: "shadow-none", border: "border-white/10" },
    unlock_requirement: null,
  },
  {
    id: "frame_lime_pulse",
    name: "Lime Pulse",
    rarity: "Rare",
    cost_gems: 40,
    style_config: { gradient: "from-lime-400/30 to-emerald-700/30", glow: "shadow-[0_0_24px_rgba(163,230,53,0.45)]", border: "border-lime-400/60" },
    unlock_requirement: { playerLevel: 4 },
  },
  {
    id: "frame_magenta_haze",
    name: "Magenta Haze",
    rarity: "Epic",
    cost_gems: 80,
    style_config: { gradient: "from-fuchsia-500/30 to-purple-800/30", glow: "shadow-[0_0_28px_rgba(217,70,239,0.5)]", border: "border-fuchsia-400/60" },
    unlock_requirement: { playerLevel: 4 },
  },
  {
    id: "frame_golden_god",
    name: "Golden God",
    rarity: "Legendary",
    cost_gems: 150,
    style_config: { gradient: "from-amber-300/30 to-yellow-700/30", glow: "shadow-[0_0_34px_rgba(251,191,36,0.55)]", border: "border-amber-300/70" },
    unlock_requirement: { playerLevel: 5 },
  },
];

export const COSMETIC_FRAMES_BY_ID: Record<string, CosmeticFrame> = Object.fromEntries(
  COSMETIC_FRAMES.map((f) => [f.id, f]),
);
