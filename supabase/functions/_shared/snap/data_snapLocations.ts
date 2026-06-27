// MIRROR of src/data/snapLocations.ts — keep in sync.
import type { SnapLocationDef } from "./types.ts";

/**
 * SNAP locations. Three are chosen deterministically per match and revealed on
 * turns 1, 2, 3. `effectId` maps to a handler in /lib/game/snap/snapLocations.ts.
 * Keep in sync with the server mirror.
 */
export const SNAP_LOCATIONS: SnapLocationDef[] = [
  {
    id: "pump_plaza",
    name: "Pump Plaza",
    effectText: "Cards here get +1 Power.",
    effectId: "pumpPlaza",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-emerald-500/30 to-lime-400/10", icon: "📈", color: "#34d399" },
    flavor: "Number go up. Always.",
  },
  {
    id: "rug_zone",
    name: "Rug Zone",
    effectText: "After turn 4, destroy the lowest-Power card here.",
    effectId: "rugZone",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-red-600/30 to-rose-500/10", icon: "🪤", color: "#f43f5e" },
    flavor: "Watch your step. And your bags.",
  },
  {
    id: "whale_wall",
    name: "Whale Wall",
    effectText: "Only one card can be played here by each side.",
    effectId: "whaleWall",
    maxSlotsPerSide: 1,
    theme: { gradient: "from-sky-500/30 to-blue-600/10", icon: "🐋", color: "#38bdf8" },
    flavor: "Big money only. One seat each.",
  },
  {
    id: "degen_alley",
    name: "Degen Alley",
    effectText: "On Reveal abilities happen twice here.",
    effectId: "degenAlley",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-fuchsia-500/30 to-purple-600/10", icon: "🎰", color: "#e879f9" },
    flavor: "Double or nothing. Then double again.",
  },
  {
    id: "diamond_hands",
    name: "Diamond Hands",
    effectText: "Cards here can't be destroyed or moved.",
    effectId: "diamondHands",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-cyan-400/30 to-indigo-500/10", icon: "💎", color: "#22d3ee" },
    flavor: "Held through everything. Literally.",
  },
  {
    id: "liquidity_pool",
    name: "Liquidity Pool",
    effectText: "At the end of each turn, give a random card here +1 Power.",
    effectId: "liquidityPool",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-teal-400/30 to-emerald-500/10", icon: "🌊", color: "#2dd4bf" },
    flavor: "The yield never sleeps.",
  },
  {
    id: "gas_war",
    name: "Gas War",
    effectText: "Cards cost 1 more to play here.",
    effectId: "gasWar",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-orange-500/30 to-amber-500/10", icon: "⛽", color: "#fb923c" },
    flavor: "200 gwei just to say gm.",
  },
  {
    id: "meme_factory",
    name: "Meme Factory",
    effectText: "When you play a card here, add a 1-Power Meme Token here.",
    effectId: "memeFactory",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-pink-500/30 to-rose-400/10", icon: "🏭", color: "#f472b6" },
    flavor: "Mass-producing pure brainrot.",
  },
  {
    id: "bear_market",
    name: "Bear Market",
    effectText: "Cards with 5 or more Power have -2 Power here.",
    effectId: "bearMarketLoc",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-red-700/30 to-stone-600/10", icon: "🐻", color: "#ef4444" },
    flavor: "The big ones bleed first.",
  },
  {
    id: "bull_run",
    name: "Bull Run",
    effectText: "Cards with 3 or less Power have +2 Power here.",
    effectId: "bullRunLoc",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-green-500/30 to-emerald-400/10", icon: "🐂", color: "#22c55e" },
    flavor: "Even the shrimp eat well.",
  },
  {
    id: "bot_farm",
    name: "Bot Farm",
    effectText: "At the end of turn 3, fill each side here with 1-Power Bots.",
    effectId: "botFarm",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-slate-500/30 to-zinc-600/10", icon: "🤖", color: "#94a3b8" },
    flavor: "gm gm gm gm gm gm gm gm",
  },
  {
    id: "final_candle",
    name: "Final Candle",
    effectText: "On turn 6, cards played here get +3 Power.",
    effectId: "finalCandle",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-amber-400/30 to-yellow-500/10", icon: "🕯️", color: "#fbbf24" },
    flavor: "One last green wick to send it.",
  },
  {
    id: "jeet_street",
    name: "Jeet Street",
    effectText: "After turn 5, move the highest-Power card here elsewhere.",
    effectId: "jeetStreet",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-rose-500/30 to-red-400/10", icon: "🏃", color: "#fb7185" },
    flavor: "Paper hands sell the top, then run.",
  },
  {
    id: "hype_chamber",
    name: "Hype Chamber",
    effectText: "If you are winning here, your cards here have +1 Power.",
    effectId: "hypeChamber",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-violet-500/30 to-fuchsia-500/10", icon: "📣", color: "#a78bfa" },
    flavor: "Momentum compounds.",
  },
  {
    id: "trenches",
    name: "Trenches",
    effectText: "Cards can't be played here after turn 4.",
    effectId: "trenches",
    maxSlotsPerSide: 4,
    theme: { gradient: "from-stone-600/30 to-neutral-700/10", icon: "🪖", color: "#a8a29e" },
    flavor: "Get in early or don't get in at all.",
  },
];

export const SNAP_LOCATIONS_BY_ID: Record<string, SnapLocationDef> =
  Object.fromEntries(SNAP_LOCATIONS.map((l) => [l.id, l]));

export function getSnapLocationDef(id: string): SnapLocationDef | undefined {
  return SNAP_LOCATIONS_BY_ID[id];
}
