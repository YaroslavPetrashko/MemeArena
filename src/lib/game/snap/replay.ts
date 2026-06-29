// Authoritative deterministic replay. Pure & isomorphic.
//
// Given the same seed, deck snapshot, boss, and player action log, this
// reproduces the exact final match state — including scoring. The client may
// run it to self-check; the Supabase Edge Function runs it as the source of
// truth for MEMEARENA rewards (never trusting the client's claimed result).

import type { SnapMatchState, SnapAction, SnapModeId } from "../../../types/snap";
import {
  createSnapMatch,
  stagePlayerCard,
  endPlayerTurn,
} from "./snapEngine";

export interface ReplayInput {
  matchId: string;
  mode: SnapModeId;
  bossId: string;
  seed: string;
  profileId: string;
  deck: { cardId: string; level: number }[];
  /** Ordered player actions captured during the match. */
  actions: SnapAction[];
  /** Bot skill used for the match (so the replay reproduces the bot's plays). */
  botSkill?: number;
}

/**
 * Replays a full match from inputs and returns the final state. Throws only on
 * structurally impossible input (unknown boss/card); illegal moves are simply
 * skipped so a tampered log can't crash the server (it just won't reproduce the
 * claimed favorable result, and the mismatch is detected by the caller).
 */
export function replayMatch(input: ReplayInput): SnapMatchState {
  const state = createSnapMatch({
    matchId: input.matchId,
    mode: input.mode,
    bossId: input.bossId,
    seed: input.seed,
    deck: input.deck,
    profileId: input.profileId,
    botSkill: input.botSkill,
  });

  // Group actions by turn, preserving order within a turn.
  const byTurn = new Map<number, SnapAction[]>();
  for (const a of input.actions) {
    const list = byTurn.get(a.turn) ?? [];
    list.push(a);
    byTurn.set(a.turn, list);
  }

  for (let turn = 1; turn <= state.maxTurns; turn++) {
    if (state.status === "complete") break;

    const actions = (byTurn.get(turn) ?? []).sort((a, b) => a.orderIndex - b.orderIndex);
    for (const a of actions) {
      stagePlayerCard(state, a.cardInstanceId, a.locationId);
    }
    endPlayerTurn(state);
  }

  return state;
}

/** Compare two final states for reward-relevant equality. */
export function resultsMatch(a: SnapMatchState, b: SnapMatchState): boolean {
  if (!a.scoring || !b.scoring) return false;
  return (
    a.scoring.result === b.scoring.result &&
    a.scoring.locationsWon === b.scoring.locationsWon &&
    a.scoring.playerTotalPower === b.scoring.playerTotalPower &&
    a.scoring.bossTotalPower === b.scoring.bossTotalPower
  );
}
