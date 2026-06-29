export function snapInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Cosmetic frame tier earned by upgrading a card. Upgrades are purely cosmetic
 * (no stat change) — leveling a card unlocks a fancier frame, from Base (Lv 1)
 * up to Prismatic (Lv 5).
 */
export type FrameTierKey = "base" | "bronze" | "silver" | "gold" | "prismatic";

export interface FrameTier {
  key: FrameTierKey;
  name: string;
  /** Accent color for the frame ring + level badge. */
  color: string;
  /** Box-shadow used as the card frame glow, or null for the plain base tier. */
  glow: string | null;
}

export function snapFrameTier(level: number): FrameTier {
  if (level >= 5)
    return {
      key: "prismatic",
      name: "Prismatic",
      color: "#b6ff1b",
      glow: "0 0 0 2px rgba(182,255,27,0.7), 0 0 18px rgba(255,43,214,0.5)",
    };
  if (level >= 4)
    return {
      key: "gold",
      name: "Gold",
      color: "#ffd24a",
      glow: "0 0 0 2px rgba(255,210,74,0.7), 0 0 14px rgba(255,210,74,0.45)",
    };
  if (level >= 3)
    return {
      key: "silver",
      name: "Silver",
      color: "#cdd3da",
      glow: "0 0 0 2px rgba(205,211,218,0.6), 0 0 12px rgba(205,211,218,0.4)",
    };
  if (level >= 2)
    return {
      key: "bronze",
      name: "Bronze",
      color: "#cd7f32",
      glow: "0 0 0 2px rgba(205,127,50,0.6), 0 0 12px rgba(205,127,50,0.4)",
    };
  return { key: "base", name: "Base", color: "#9aa0ad", glow: null };
}
