// Boss passive abilities. Pure & deterministic. Resolved by passiveId.
//
// Two hooks: pre-reveal (setup / per-turn before staging resolves) and
// post-reveal (after both sides flip this turn). Some passives are turn-gated.

import type { SnapMatchState, SnapLocation } from "../../../types/snap";
import type { Rng } from "./prng";
import { getSnapBoss } from "../../../data/snapBosses";
import {
  sideCards,
  setSideCards,
  openSlots,
  locationLeader,
  logEvent,
} from "./helpers";
import { spawnTokenAt, moveCardToRandomLocation } from "./engineOps";

/** Runs at setup ("setup") and at the start of each turn ("turn"). */
export function applyBossPassivePreReveal(
  state: SnapMatchState,
  rng: Rng,
  phase: "setup" | "turn",
): void {
  const boss = getSnapBoss(state.bossId);
  if (!boss?.passiveId) return;

  switch (boss.passiveId) {
    case "startWithBot": {
      if (phase === "setup") {
        const revealed = state.locations.filter((l) => l.isRevealed);
        const loc = revealed.length
          ? revealed[Math.floor(rng.next() * revealed.length)]
          : state.locations[0];
        spawnTokenAt("bot_token", "boss", loc, state, rng);
        logEvent(state, "ability", `${boss.name} starts with a Bot at ${loc.name}.`);
      }
      break;
    }
    case "revealLastOnTurn6": {
      if (phase === "setup") state.flags["bossRevealsLastTurn6"] = true;
      break;
    }
    case "turn6BonusEnergy": {
      if (phase === "turn" && state.turn === 6) state.boss.energy += 1;
      break;
    }
    default:
      break;
  }
}

/** Runs after both sides reveal each turn. */
export function applyBossPassivePostReveal(state: SnapMatchState, rng: Rng): void {
  const boss = getSnapBoss(state.bossId);
  if (!boss?.passiveId) return;

  switch (boss.passiveId) {
    case "movePlayerCardAfterTurn4": {
      if (state.turn > 4 && !state.flags["goblinMoveUsed"]) {
        const targets = state.locations.flatMap((loc) =>
          loc.playerCards.map((c) => ({ c, loc })),
        );
        if (targets.length) {
          const pick = targets[Math.floor(rng.next() * targets.length)];
          const dest = moveCardToRandomLocation(state, pick.c, pick.loc, rng);
          if (dest) {
            state.flags["goblinMoveUsed"] = true;
            logEvent(state, "ability", `${boss.name} rugged your ${pick.c.name} to ${dest.name}.`);
          }
        }
      }
      break;
    }
    case "earlyTurnsPlusOne": {
      if (state.turn <= 3) {
        for (const loc of state.locations) {
          for (const card of loc.bossCards) {
            if (card.isRevealed && !card.modifiers.some((m) => m.source === `earlyboss:${card.instanceId}`)) {
              // Buff only cards revealed THIS turn (no permanent flag yet).
              card.modifiers.push({ source: `earlyboss:${card.instanceId}`, amount: 1, kind: "permanent" });
            }
          }
        }
      }
      break;
    }
    case "firstCardEachLocationPlusTwo": {
      for (const loc of state.locations) {
        if (loc.bossCards.length && !state.flags[`firstCardBuffed:${loc.id}`]) {
          const first = loc.bossCards[0];
          first.modifiers.push({ source: `firstcard:${first.instanceId}`, amount: 2, kind: "permanent" });
          state.flags[`firstCardBuffed:${loc.id}`] = true;
        }
      }
      break;
    }
    case "firstOngoingPlusTwo": {
      if (!state.flags["firstOngoingBuffed"]) {
        const ongoing = state.locations
          .flatMap((l) => l.bossCards)
          .find((c) => c.abilityType === "ongoing" && c.isRevealed);
        if (ongoing) {
          ongoing.modifiers.push({ source: `firstongoing:${ongoing.instanceId}`, amount: 2, kind: "permanent" });
          state.flags["firstOngoingBuffed"] = true;
          logEvent(state, "ability", `${boss.name}'s ${ongoing.name} surges +2.`);
        }
      }
      break;
    }
    case "stealFromWinningLocationsTurn5": {
      if (state.turn === 5) {
        for (const loc of state.locations) {
          if (locationLeader(loc) === "player") {
            // Steal 1 power: remove from a player card, add a boss bot's worth.
            stealOnePower(state, loc, rng);
          }
        }
      }
      break;
    }
    default:
      break;
  }
}

function stealOnePower(state: SnapMatchState, loc: SnapLocation, rng: Rng): void {
  const candidates = loc.playerCards.filter((c) => c.currentPower > 0);
  if (!candidates.length) return;
  const t = candidates[Math.floor(rng.next() * candidates.length)];
  t.modifiers.push({ source: `vampire:t5`, amount: -1, kind: "permanent" });
  // Give the boss the point via a bot if there's room, else buff a boss card.
  if (openSlots(loc, "boss") > 0) {
    spawnTokenAt("bot_token", "boss", loc, state, rng);
  } else if (loc.bossCards.length) {
    const b = loc.bossCards[0];
    b.modifiers.push({ source: `vampire:t5`, amount: 1, kind: "permanent" });
  }
  logEvent(state, "ability", `${getSnapBoss(state.bossId)?.name} drained Power at ${loc.name}.`);
  void setSideCards;
  void sideCards;
}
