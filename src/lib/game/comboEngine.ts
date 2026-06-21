import type { BattleState, ComboDefinition, StatusEffect, StatusEffectType } from "@/types";
import type { BattleFx } from "./cardEffects";
import { COMBOS } from "@/data/combos";

function addStatus(target: { statuses: StatusEffect[] }, type: StatusEffectType, amount: number, duration: number) {
  const existing = target.statuses.find((s) => s.type === type);
  if (existing) {
    existing.amount += amount;
    existing.duration = Math.max(existing.duration, duration);
  } else {
    target.statuses.push({ type, amount, duration });
  }
}

export interface ComboResult {
  triggered: ComboDefinition[];
  fx: BattleFx[];
  logs: string[];
  draw: number;
}

function isComboMet(combo: ComboDefinition, counts: Record<string, number>): boolean {
  if (combo.repeatCardId) {
    return (counts[combo.repeatCardId] ?? 0) >= (combo.repeatCount ?? 1);
  }
  if (combo.cards) {
    return combo.cards.every((id) => (counts[id] ?? 0) > 0);
  }
  return false;
}

/**
 * Check for newly-satisfied combos after a card is played, apply their effects,
 * and return banners/FX. A combo only fires once per battle.
 */
export function checkCombos(state: BattleState): ComboResult {
  const fx: BattleFx[] = [];
  const logs: string[] = [];
  let draw = 0;
  const triggered: ComboDefinition[] = [];

  for (const combo of COMBOS) {
    if (state.combosTriggered.includes(combo.id)) continue;
    if (!isComboMet(combo, state.cardPlayCounts)) continue;

    state.combosTriggered.push(combo.id);
    triggered.push(combo);
    const eff = combo.effect;
    const player = state.player;
    const enemy = state.enemy;

    if (eff.bonusDamage) {
      let remaining = eff.bonusDamage;
      if (enemy.shield > 0) {
        const absorbed = Math.min(enemy.shield, remaining);
        enemy.shield -= absorbed;
        remaining -= absorbed;
      }
      enemy.hp = Math.max(0, enemy.hp - remaining);
      state.damageDealt += eff.bonusDamage;
      fx.push({ kind: "damage", target: "enemy", value: eff.bonusDamage });
    }
    if (eff.heal) {
      player.hp = Math.min(player.maxHp, player.hp + eff.heal);
      fx.push({ kind: "heal", target: "player", value: eff.heal });
    }
    if (eff.shield) {
      player.shield += eff.shield;
      fx.push({ kind: "shield", target: "player", value: eff.shield });
    }
    if (eff.cleanse) {
      for (let i = 0; i < eff.cleanse; i++) {
        const idx = player.statuses.findIndex((s) => ["Burn", "Confused", "Rugged"].includes(s.type));
        if (idx >= 0) player.statuses.splice(idx, 1);
      }
    }
    if (eff.guaranteedCrit) player.guaranteedCrit = true;
    if (eff.guaranteedStun) player.guaranteedStun = true;
    if (eff.hype) player.hype = true;
    if (eff.nextAttackBonus) player.nextAttackBonus += eff.nextAttackBonus;
    if (eff.dodge) addStatus(player, "Dodge", eff.dodge, -1);
    if (eff.applyStatus) {
      for (const st of eff.applyStatus) {
        addStatus(enemy, st, 1, 1);
        fx.push({ kind: "status", target: "enemy", label: st });
      }
    }
    if (eff.draw) draw += eff.draw;

    fx.push({ kind: "status", target: "player", label: combo.banner });
    logs.push(`COMBO — ${combo.name}: ${combo.description.split("→")[1]?.trim() ?? combo.name}`);
  }

  return { triggered, fx, logs, draw };
}
