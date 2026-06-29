import type { GameMode, GameModeId } from "@/types";

/**
 * Game modes. Currently a single always-free Arena mode (PvP variants may be
 * added here later). Entry gating still flows through /lib/game/entryGates.ts
 * and the consume-mode-entry Edge Function, but Arena is free + unlimited.
 */
export const GAME_MODES: GameMode[] = [
  {
    id: "arena",
    name: "Arena",
    tagline: "Battle for MEMEARENA",
    description:
      "The main mode. Free to enter, unlimited fights. Beat the opponent across three locations to earn Coins and MEMEARENA.",
    icon: "swords",
    freeEntriesPerDay: Infinity,
    entryCost: null,
    unlockLevel: 1,
    rewardSummary: "0.5–8 MEMEARENA per win",
    accent: "lime",
    requiresWalletForTokens: true,
  },
];

export const GAME_MODES_BY_ID: Record<GameModeId, GameMode> = Object.fromEntries(
  GAME_MODES.map((m) => [m.id, m]),
) as Record<GameModeId, GameMode>;

/** Level → unlocked feature labels, used on the progression UI. */
export const UNLOCKS_BY_LEVEL: Record<number, string[]> = {
  1: ["Arena"],
  4: ["Cosmetic frames"],
  5: ["Advanced combos"],
};
