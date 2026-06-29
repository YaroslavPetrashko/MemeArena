import type { GameModeId } from "@/types";
import { GAME_MODES_BY_ID } from "@/data/modes";

export interface DailyEntryState {
  freeDailyBossUsed: boolean;
  freeSurvivalRunsUsed: number;
}

export interface EntryBalances {
  gems: number;
  playerLevel: number;
}

export type EntryMethod = "free" | "gems" | "locked";

export interface EntryOption {
  method: EntryMethod;
  label: string;
  cost: number;
  currency: "gems" | "none";
  affordable: boolean;
}

export interface EntryAvailability {
  mode: GameModeId;
  unlocked: boolean;
  freeAvailable: boolean;
  freeRemaining: number;
  options: EntryOption[];
  /** The cheapest currently-usable method, or "locked". */
  recommended: EntryMethod;
  reason: string;
}

export function freeEntriesRemaining(mode: GameModeId): number {
  const def = GAME_MODES_BY_ID[mode];
  if (def.freeEntriesPerDay === Infinity) return Infinity;
  return def.freeEntriesPerDay;
}

export function getEntryAvailability(
  mode: GameModeId,
  daily: DailyEntryState,
  balances: EntryBalances,
): EntryAvailability {
  const def = GAME_MODES_BY_ID[mode];
  const unlocked = balances.playerLevel >= def.unlockLevel;
  const freeRemaining = freeEntriesRemaining(mode);
  const freeAvailable = freeRemaining > 0;

  const options: EntryOption[] = [];
  if (freeAvailable) {
    options.push({ method: "free", label: "Free Entry", cost: 0, currency: "none", affordable: true });
  }
  if (def.entryCost?.gems) {
    options.push({
      method: "gems",
      label: `${def.entryCost.gems} Gems`,
      cost: def.entryCost.gems,
      currency: "gems",
      affordable: balances.gems >= def.entryCost.gems,
    });
  }

  let recommended: EntryMethod = "locked";
  let reason = "";
  if (!unlocked) {
    reason = `Reach player level ${def.unlockLevel} to unlock.`;
  } else if (freeAvailable) {
    recommended = "free";
  } else {
    const gemOpt = options.find((o) => o.method === "gems" && o.affordable);
    if (gemOpt) recommended = "gems";
    else {
      reason =
        options.length > 0
          ? "Not enough Gems. Buy Gems in the Shop."
          : "No entries available right now.";
    }
  }

  return { mode, unlocked, freeAvailable, freeRemaining, options, recommended, reason };
}
