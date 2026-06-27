// Soft boss-intent hints for the UI. Deterministic, derived from board state +
// boss personality. Never reveals the boss's exact staged plays — just a vibe,
// so PvE feels fair and readable.

import type { SnapMatchState } from "../../../types/snap";
import { getSnapBoss } from "../../../data/snapBosses";
import { locationLeader } from "./helpers";

export function bossIntentHint(state: SnapMatchState): string {
  const boss = getSnapBoss(state.bossId);
  if (!boss) return "";
  if (state.status === "complete") return "The dust settles.";

  // Find a location the boss is losing by a small margin.
  const contested = state.locations
    .filter((l) => l.isRevealed && locationLeader(l) === "player")
    .sort((a, b) => (a.playerPower - a.bossPower) - (b.playerPower - b.bossPower))[0];

  const personalityLine: Record<string, string> = {
    aggressive: "is itching to swing hard.",
    disruptive: "is likely to disrupt your strongest lane.",
    greedy: "is saving Energy for a late swing.",
    wide: "may go wide this turn.",
    stacker: "wants to stack one location.",
    chaotic: "is unpredictable right now.",
  };

  if (state.turn >= 5 && boss.personality === "greedy") {
    return `${boss.name} is about to unload.`;
  }
  if (contested) {
    const loc = state.locations.find((l) => l.id === contested.id);
    return `${boss.name} is eyeing ${loc?.name ?? "a location"}.`;
  }
  return `${boss.name} ${personalityLine[boss.personality] ?? "is plotting."}`;
}
