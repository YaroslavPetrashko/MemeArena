import type { SnapLocationDef } from "@/types/snap";

/**
 * SNAP locations. Three are chosen deterministically per match and revealed on
 * turns 1, 2, 3. `effectId` maps to a handler in /lib/game/snap/snapLocations.ts.
 */
export const SNAP_LOCATIONS: SnapLocationDef[] = [
  {
    id: "agartha",
    name: "Agartha",
    effectText: "At the end of each turn, give a random card here +1 Power.",
    effectId: "liquidityPool",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-violet-600/30 to-purple-900/10", icon: "🌍", color: "#8b5cf6" },
    flavor: "Deep underground, power grows slowly but surely.",
  },
  {
    id: "chillhouse",
    name: "Chillhouse",
    effectText: "Cards with 3 or less Power have +2 Power here.",
    effectId: "bullRunLoc",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-teal-400/30 to-cyan-500/10", icon: "🛋️", color: "#2dd4bf" },
    flavor: "Good vibes only. Small cards feel right at home.",
  },
  {
    id: "solangeles",
    name: "Solangeles",
    effectText: "On Reveal abilities happen twice here.",
    effectId: "degenAlley",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-orange-400/30 to-yellow-500/10", icon: "🌴", color: "#fb923c" },
    flavor: "Sunshine, gains, and double the On Reveals.",
  },
  {
    id: "miami",
    name: "Miami",
    effectText: "Cards here get +1 Power.",
    effectId: "pumpPlaza",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-pink-500/30 to-rose-400/10", icon: "🌊", color: "#f472b6" },
    flavor: "Number go up. Always.",
  },
  {
    id: "backrooms",
    name: "Backrooms",
    effectText: "After turn 4, destroy the lowest-Power card here.",
    effectId: "rugZone",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-yellow-600/30 to-amber-800/10", icon: "🚪", color: "#ca8a04" },
    flavor: "You shouldn't be here. Neither should your weakest card.",
  },
  {
    id: "wall_street",
    name: "Wall Street",
    effectText: "Cards with 5 or more Power have -2 Power here.",
    effectId: "bearMarketLoc",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-slate-600/30 to-zinc-700/10", icon: "🏦", color: "#64748b" },
    flavor: "The suits punish the whales. Big Power gets taxed.",
  },
  {
    id: "crypto_bro_room",
    name: "Crypto Bro Room",
    effectText: "If you are winning here, your cards here have +1 Power.",
    effectId: "hypeChamber",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-amber-400/30 to-yellow-600/10", icon: "💰", color: "#fbbf24" },
    flavor: "Momentum compounds. Winners get more winning.",
  },
  {
    id: "garage_with_supercars",
    name: "Garage with Supercars",
    effectText: "Only one card can be played here by each side.",
    effectId: "whaleWall",
    maxSlotsPerSide: 1,
    theme: { gradient: "from-red-600/30 to-rose-700/10", icon: "🏎️", color: "#ef4444" },
    flavor: "Exclusive. One seat. Make it count.",
  },
];

export const SNAP_LOCATIONS_BY_ID: Record<string, SnapLocationDef> =
  Object.fromEntries(SNAP_LOCATIONS.map((l) => [l.id, l]));

export function getSnapLocationDef(id: string): SnapLocationDef | undefined {
  return SNAP_LOCATIONS_BY_ID[id];
}
