import type { BattleState, BossAIMove, StatusEffect, StatusEffectType } from "@/types";
import type { Rng } from "./rng";
import type { BattleFx } from "./cardEffects";
import { getBoss } from "@/data/bosses";

function addStatus(target: { statuses: StatusEffect[] }, type: StatusEffectType, amount: number, duration: number) {
  const existing = target.statuses.find((s) => s.type === type);
  if (existing) {
    existing.amount += amount;
    existing.duration = Math.max(existing.duration, duration);
  } else {
    target.statuses.push({ type, amount, duration });
  }
}

/** Weighted-random move selection from the boss AI table. */
export function chooseBossMove(bossId: string, rng: Rng): BossAIMove | null {
  const boss = getBoss(bossId);
  if (!boss) return null;
  const moves = boss.ai_pattern.moves;
  const total = moves.reduce((s, m) => s + m.weight, 0);
  let roll = rng.next() * total;
  for (const m of moves) {
    roll -= m.weight;
    if (roll <= 0) return m;
  }
  return moves[moves.length - 1];
}

export interface BossMoveResult {
  fx: BattleFx[];
  logs: string[];
}

/**
 * Resolve the boss's telegraphed intent against the player. Honors player
 * Dodge, boss Chill (halved damage), Confused (chance to fizzle), and Stun
 * (handled by caller, which skips this entirely).
 */
export function applyBossMove(state: BattleState, move: BossAIMove, rng: Rng): BossMoveResult {
  const fx: BattleFx[] = [];
  const logs: string[] = [];
  const player = state.player;
  const enemy = state.enemy;

  // Confused boss may fail its move.
  const confused = enemy.statuses.find((s) => s.type === "Confused");
  if (confused && rng.chance(0.5)) {
    logs.push(`${enemy.name} is Confused and fumbles ${move.name}!`);
    fx.push({ kind: "status", target: "enemy", label: "Confused" });
    return { fx, logs };
  }

  // Boss self shield / heal.
  if (move.shield) {
    enemy.shield += move.shield;
    fx.push({ kind: "shield", target: "enemy", value: move.shield });
    logs.push(`${enemy.name} uses ${move.name} (+${move.shield} shield).`);
  }
  if (move.heal) {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + move.heal);
    fx.push({ kind: "heal", target: "enemy", value: move.heal });
    logs.push(`${enemy.name} uses ${move.name} (heals ${move.heal}).`);
  }

  // Damage to player.
  if (move.damage) {
    let dmg = move.damage;
    if (move.scalesWithMissingHp) {
      const missingFrac = 1 - player.hp / player.maxHp;
      dmg = Math.round(dmg * (1 + missingFrac));
    }
    // Chill on boss halves outgoing damage.
    if (enemy.statuses.some((s) => s.type === "Chill")) {
      dmg = Math.ceil(dmg / 2);
      logs.push(`${enemy.name} is Chilled — damage reduced.`);
    }

    // Player Dodge negates the hit.
    const dodge = player.statuses.find((s) => s.type === "Dodge");
    if (dodge && dodge.amount > 0) {
      dodge.amount -= 1;
      if (dodge.amount <= 0) player.statuses = player.statuses.filter((s) => s.type !== "Dodge");
      fx.push({ kind: "status", target: "player", label: "Dodged!" });
      logs.push(`Dodged ${move.name}!`);
    } else {
      let remaining = dmg;
      if (player.shield > 0) {
        const absorbed = Math.min(player.shield, remaining);
        player.shield -= absorbed;
        remaining -= absorbed;
      }
      player.hp = Math.max(0, player.hp - remaining);
      fx.push({ kind: move.isBigAttack ? "crit" : "damage", target: "player", value: dmg });
      logs.push(`${enemy.name} uses ${move.name} for ${dmg}.`);
    }
  }

  // Status applied to player.
  if (move.applyStatus) {
    for (const st of move.applyStatus) {
      addStatus(player, st, 1, 2);
      fx.push({ kind: "status", target: "player", label: st });
      logs.push(`${enemy.name} applies ${st}.`);
    }
  }

  return { fx, logs };
}
