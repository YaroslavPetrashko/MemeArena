import type { GameModeId } from "@/types";
import { GAME_MODES_BY_ID } from "@/data/modes";

/**
 * Entry gating: free entries → Arena Tickets → Gems. This is the grind-or-pay
 * gate. The consume-mode-entry Edge Function is authoritative; this mirrors the
 * logic client-side for instant UI feedback.
 */
export interface DailyEntryState {
  freeDailyBossUsed: boolean;
  freeSurvivalRunsUsed: number;
}

export interface EntryBalances {
  tickets: number;
  gems: number;
  playerLevel: number;
}

export type EntryMethod = "free" | "ticket" | "gems" | "locked";

export interface EntryOption {
  method: EntryMethod;
  label: string;
  cost: number;
  currency: "ticket" | "gems" | "none";
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

export function freeEntriesRemaining(
  mode: GameModeId,
  daily: DailyEntryState,
): number {
  const def = GAME_MODES_BY_ID[mode];
  if (def.freeEntriesPerDay === Infinity) return Infinity;
  if (mode === "daily_boss") return daily.freeDailyBossUsed ? 0 : 1;
  if (mode === "survival") return Math.max(0, def.freeEntriesPerDay - daily.freeSurvivalRunsUsed);
  return def.freeEntriesPerDay;
}

export function getEntryAvailability(
  mode: GameModeId,
  daily: DailyEntryState,
  balances: EntryBalances,
): EntryAvailability {
  const def = GAME_MODES_BY_ID[mode];
  const unlocked = balances.playerLevel >= def.unlockLevel;
  const freeRemaining = freeEntriesRemaining(mode, daily);
  const freeAvailable = freeRemaining > 0;

  const options: EntryOption[] = [];
  if (freeAvailable) {
    options.push({ method: "free", label: "Free Entry", cost: 0, currency: "none", affordable: true });
  }
  if (def.entryCost?.tickets) {
    options.push({
      method: "ticket",
      label: `${def.entryCost.tickets} Arena Ticket${def.entryCost.tickets > 1 ? "s" : ""}`,
      cost: def.entryCost.tickets,
      currency: "ticket",
      affordable: balances.tickets >= def.entryCost.tickets,
    });
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
    const ticketOpt = options.find((o) => o.method === "ticket" && o.affordable);
    const gemOpt = options.find((o) => o.method === "gems" && o.affordable);
    if (ticketOpt) recommended = "ticket";
    else if (gemOpt) recommended = "gems";
    else {
      reason =
        options.length > 0
          ? "Not enough Arena Tickets or Gems. Grind regular modes or buy Gems in the Shop."
          : "No entries available right now.";
    }
  }

  return { mode, unlocked, freeAvailable, freeRemaining, options, recommended, reason };
}
