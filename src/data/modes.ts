import type { GameMode, GameModeId } from "@/types";

/**
 * Game modes. Entry gating (free entries / ticket / gem cost) is enforced by
 * /lib/game/entryGates.ts and the consume-mode-entry Edge Function.
 */
export const GAME_MODES: GameMode[] = [
  {
    id: "boss_rush",
    name: "Boss Rush",
    tagline: "Climb the boss ladder",
    description:
      "The main progression mode. Free to enter. Bosses unlock sequentially and later bosses pay more. Earn Coins, XP, Shards, a chance at Arena Tickets, and small MEMEARENA.",
    icon: "swords",
    freeEntriesPerDay: Infinity,
    entryCost: null,
    unlockLevel: 1,
    rewardSummary: "0.5–8 MEMEARENA per win",
    accent: "lime",
    requiresWalletForTokens: true,
  },
  {
    id: "daily_boss",
    name: "Daily Meme Boss",
    tagline: "One boss. One shot a day.",
    description:
      "A rotating daily boss. One free entry per day; extra entries cost 1 Arena Ticket or 25 Gems. Score-based reward brackets with weekly leaderboard bonuses.",
    icon: "calendar",
    freeEntriesPerDay: 1,
    entryCost: { tickets: 1, gems: 25 },
    unlockLevel: 1,
    rewardSummary: "3–20 MEMEARENA (score-based)",
    accent: "magenta",
    requiresWalletForTokens: true,
  },
  {
    id: "survival",
    name: "Survival",
    tagline: "How deep can you go?",
    description:
      "Endless waves of escalating bots. First 3 runs daily are free; extra entries cost 1 Arena Ticket or 15 Gems. Token rewards only after wave 5 — higher waves pay sharply more.",
    icon: "infinity",
    freeEntriesPerDay: 3,
    entryCost: { tickets: 1, gems: 15 },
    unlockLevel: 2,
    rewardSummary: "1–30 MEMEARENA (wave-based)",
    accent: "gold",
    requiresWalletForTokens: true,
  },
  {
    id: "limited_event",
    name: "Limited Event — Brainrot Week",
    tagline: "Italian brainrot ascendant",
    description:
      "This week: face the Liquidity Vampire. Entry costs 3 Arena Tickets or 75 Gems. Italian Brainrot cards deal +20% damage. Big MEMEARENA payouts and a special event leaderboard.",
    icon: "zap",
    freeEntriesPerDay: 0,
    entryCost: { tickets: 3, gems: 75 },
    unlockLevel: 3,
    rewardSummary: "10–75 MEMEARENA (score-based)",
    accent: "magenta",
    requiresWalletForTokens: true,
  },
  {
    id: "high_roller",
    name: "High Roller Challenge",
    tagline: "Coming soon",
    description:
      "A future high-stakes mode for endgame players. Entry costs 10 Arena Tickets or 250 Gems. Requires player level 8+, a deck power threshold, and weekly eligibility.",
    icon: "crown",
    freeEntriesPerDay: 0,
    entryCost: { tickets: 10, gems: 250 },
    unlockLevel: 8,
    rewardSummary: "50–250 MEMEARENA",
    accent: "gold",
    requiresWalletForTokens: true,
  },
];

export const GAME_MODES_BY_ID: Record<GameModeId, GameMode> = Object.fromEntries(
  GAME_MODES.map((m) => [m.id, m]),
) as Record<GameModeId, GameMode>;

/** Level → unlocked feature labels, used on the progression UI. */
export const UNLOCKS_BY_LEVEL: Record<number, string[]> = {
  1: ["Boss Rush", "Daily Meme Boss"],
  2: ["Survival mode"],
  3: ["Limited Event"],
  4: ["Cosmetic frames"],
  5: ["Advanced combos"],
  8: ["High Roller Challenge"],
};

/** Limited event window (Brainrot Week). Editable for future events. */
export const ACTIVE_EVENT = {
  id: "brainrot_week",
  name: "Brainrot Week",
  bossId: "liquidity_vampire",
  /** Days the event runs from "now" for demo purposes. */
  durationDays: 7,
  damageBuffTag: "italian-brainrot" as const,
  damageBuffMultiplier: 1.2,
};
