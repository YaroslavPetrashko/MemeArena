// SNAP match scoring. Pure & deterministic.
//
// Win 2 of 3 locations to win the match. If both sides win one and tie one,
// total board power is the tiebreaker. The composite `total` score feeds reward
// brackets and leaderboards.

import type {
  SnapMatchState,
  SnapScore,
  SnapResult,
  SnapLocationScore,
} from "../../../types/snap";
import { recalcLocationPower, locationLeader, totalBoardPower } from "./helpers";

export function calculatePowerDifferential(state: SnapMatchState): number {
  return totalBoardPower(state, "player") - totalBoardPower(state, "boss");
}

export function calculateSnapScore(
  state: SnapMatchState,
  difficultyValue: number,
): SnapScore {
  for (const loc of state.locations) recalcLocationPower(loc);

  const locationScores: SnapLocationScore[] = state.locations.map((loc) => ({
    locationId: loc.id,
    playerPower: loc.playerPower,
    bossPower: loc.bossPower,
    winner: locationLeader(loc),
  }));

  const won = locationScores.filter((l) => l.winner === "player").length;
  const lost = locationScores.filter((l) => l.winner === "boss").length;
  const tied = locationScores.filter((l) => l.winner === "tie").length;

  const playerTotal = totalBoardPower(state, "player");
  const bossTotal = totalBoardPower(state, "boss");

  let result: SnapResult;
  if (won > lost) result = "win";
  else if (lost > won) result = "loss";
  else {
    // Equal locations won → total board power tiebreak.
    if (playerTotal > bossTotal) result = "win";
    else if (bossTotal > playerTotal) result = "loss";
    else result = "draw";
  }

  // Final-turn swing: how much the player's location-lead count improved on the
  // last turn is approximated by comparing differentials (stored via flags).
  const prevDiff = (state.flags["preFinalDiff"] as number) ?? 0;
  const finalTurnSwing = Math.max(0, (playerTotal - bossTotal) - prevDiff);

  const difficultyMultiplier = 0.8 + difficultyValue * 0.15;
  const streakMultiplier =
    state.mode === "survival" ? 1 + Math.min(2, (state.survivalWave ?? 0) * 0.1) : 1;
  const eventMultiplier = state.isEvent ? 1.25 : 1;

  // Composite score.
  const victoryBonus = result === "win" ? 1000 : result === "draw" ? 300 : 100;
  const locationPoints = won * 350;
  const powerPoints = Math.max(0, playerTotal - bossTotal) * 8;
  const swingPoints = finalTurnSwing * 12;
  const base = victoryBonus + locationPoints + powerPoints + swingPoints;
  const total = Math.round(
    base * difficultyMultiplier * streakMultiplier * eventMultiplier,
  );

  return {
    result,
    locationsWon: won,
    locationsLost: lost,
    locationsTied: tied,
    playerTotalPower: playerTotal,
    bossTotalPower: bossTotal,
    powerDifferential: playerTotal - bossTotal,
    finalTurnSwing,
    difficultyMultiplier,
    streakMultiplier,
    eventMultiplier,
    total,
    locations: locationScores,
  };
}

export function calculateRewardMultiplier(score: SnapScore): number {
  return score.difficultyMultiplier * score.eventMultiplier * score.streakMultiplier;
}
