import type { BattleState } from "@/types";
import type { ArenaBattleState } from "@/types/arena";

/**
 * Arena → legacy bridge. The reward ledger, score formula, and Supabase
 * submission all consume a `BattleState`. Rather than fork that logic, we map a
 * finished arena battle into a `BattleState`-shaped object so every existing
 * tokenomics/anti-cheat path keeps working untouched.
 *
 * Mapping:
 *  - player.hp/maxHp  ← player base HP (the "survivability" the formula rewards)
 *  - damageDealt      ← total boss core damage
 *  - turn             ← clear time in seconds (lower = faster = more score)
 *  - combosTriggered  ← arena combos fired
 *  - wave             ← survival wave reached
 *  - actionLog        ← arena action log (deterministic replay record)
 */
export function arenaToBattleState(arena: ArenaBattleState): BattleState {
  const won = arena.status === "won";
  const clearSeconds = Math.max(1, Math.round(arena.battleTime / 1000));

  return {
    battleId: arena.battleId,
    mode: arena.mode,
    bossId: arena.boss.bossId,
    seed: arena.seed,
    // "turn" feeds speed bonuses; use a turn-equivalent so fast clears score high.
    turn: Math.max(1, Math.round(clearSeconds / 6)),
    player: {
      hp: Math.round(arena.playerBaseHp),
      maxHp: arena.playerBaseMaxHp,
      energy: Math.floor(arena.energy),
      maxEnergy: arena.maxEnergy,
      shield: 0,
      statuses: [],
      deck: [],
      hand: [],
      discard: [],
      nextCardDiscount: 0,
      pendingEnergy: 0,
      hype: false,
      nextAttackBonus: 0,
      guaranteedCrit: false,
      guaranteedStun: false,
      cardsPlayedThisTurn: 0,
    },
    enemy: {
      bossId: arena.boss.bossId,
      name: arena.boss.name,
      hp: Math.round(arena.boss.coreHp),
      maxHp: arena.boss.coreMaxHp,
      shield: 0,
      statuses: [],
      intent: null,
      turnCount: 0,
    },
    result: won ? "win" : "loss",
    combosTriggered: arena.combosTriggered,
    cardPlayCounts: {},
    actionLog: arena.actionLog.map((a, i) => ({
      type: a.type === "deploy" ? "play_card" : a.type === "boss_cast" ? "boss_move" : a.type === "start" ? "start" : "end_turn",
      turn: i,
      cardId: a.cardId,
      moveId: a.detail,
      timestamp: a.t,
    })),
    damageDealt: Math.round(arena.totalBossDamage),
    wave: arena.mode === "survival" ? arena.wave : undefined,
    log: [],
  };
}

export interface ArenaScoreBreakdown {
  total: number;
  bossDamage: number;
  baseHpBonus: number;
  speedBonus: number;
  comboBonus: number;
  waveBonus: number;
  unitLossPenalty: number;
}

/** Arena-native score (post-match breakdown). */
export function computeArenaScore(arena: ArenaBattleState): ArenaScoreBreakdown {
  const won = arena.status === "won";
  const bossDamage = Math.round(arena.totalBossDamage * 1.2);
  const baseFrac = arena.playerBaseHp / arena.playerBaseMaxHp;
  const baseHpBonus = won ? Math.round(baseFrac * 800) : Math.round(baseFrac * 200);
  const clearSeconds = arena.battleTime / 1000;
  const speedBonus = won ? Math.max(0, Math.round(1200 - clearSeconds * 6)) : 0;
  const comboBonus = arena.combosTriggered.length * 250;
  const waveBonus = arena.wave * 300;
  const unitLossPenalty = Math.min(400, arena.unitsLost * 15);

  const total = Math.max(
    0,
    bossDamage + baseHpBonus + speedBonus + comboBonus + waveBonus - unitLossPenalty,
  );
  return { total, bossDamage, baseHpBonus, speedBonus, comboBonus, waveBonus, unitLossPenalty };
}
