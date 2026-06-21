import type { BattleState, StatusEffect, StatusEffectType } from "@/types";
import type { Rng } from "./rng";
import { resolveCard } from "./upgrades";
import { ACTIVE_EVENT } from "@/data/modes";
import { getCard } from "@/data/cards";

/** Visual feedback events emitted by effect resolution (drives animations). */
export interface BattleFx {
  kind:
    | "damage"
    | "crit"
    | "shield"
    | "heal"
    | "stun"
    | "status"
    | "misfire"
    | "draw"
    | "energy";
  target: "enemy" | "player";
  value?: number;
  label?: string;
}

export interface CardPlayResult {
  fx: BattleFx[];
  /** Human-readable log lines. */
  logs: string[];
  /** Cards to draw after this resolves. */
  draw: number;
}

const HYPE_BONUS = 4;

function addStatus(target: { statuses: StatusEffect[] }, type: StatusEffectType, amount: number, duration: number) {
  const existing = target.statuses.find((s) => s.type === type);
  if (existing) {
    existing.amount += amount;
    existing.duration = Math.max(existing.duration, duration);
  } else {
    target.statuses.push({ type, amount, duration });
  }
}

/** Deal damage to the enemy, respecting shield then HP. Returns dealt amount. */
function damageEnemy(state: BattleState, amount: number): number {
  const enemy = state.enemy;
  let remaining = amount;
  if (enemy.shield > 0) {
    const absorbed = Math.min(enemy.shield, remaining);
    enemy.shield -= absorbed;
    remaining -= absorbed;
  }
  enemy.hp = Math.max(0, enemy.hp - remaining);
  state.damageDealt += amount;
  return amount;
}

/**
 * Apply a card's effect to the battle state. Mutates `state` and returns FX
 * + logs for the UI. `mode` enables the Brainrot Week damage buff.
 */
export function applyCardEffect(
  state: BattleState,
  cardId: string,
  level: number,
  rng: Rng,
): CardPlayResult {
  const fx: BattleFx[] = [];
  const logs: string[] = [];
  let draw = 0;

  const resolved = resolveCard(cardId, level);
  const card = getCard(cardId);
  if (!resolved || !card) return { fx, logs, draw };

  const e = resolved.effect;
  const player = state.player;
  const enemy = state.enemy;
  const isUlt = resolved.isUltimate;
  const hasPassive = resolved.hasPassive;

  // Brainrot Week: Italian brainrot cards deal +20% damage.
  const eventBuff =
    state.mode === "limited_event" && card.tags.includes(ACTIVE_EVENT.damageBuffTag)
      ? ACTIVE_EVENT.damageBuffMultiplier
      : 1;

  const lastCardId = state.actionLog.filter((a) => a.type === "play_card").slice(-2, -1)[0]?.cardId;
  const lastWasDamage = lastCardId ? !!getCard(lastCardId)?.base_effect.damage : false;

  // ---- Chaos (Tralalero Tralala) ----
  if (e.chaos) {
    const misfireChance = isUlt ? 0 : hasPassive ? 0.08 : 0.2;
    const positives: Array<() => void> = [
      () => { damageEnemy(state, 7); fx.push({ kind: "damage", target: "enemy", value: 7 }); logs.push("Tralalero blasts for 7."); },
      () => { player.hp = Math.min(player.maxHp, player.hp + 4); fx.push({ kind: "heal", target: "player", value: 4 }); logs.push("Tralalero heals 4."); },
      () => { player.shield += 5; fx.push({ kind: "shield", target: "player", value: 5 }); logs.push("Tralalero shields 5."); },
      () => { addStatus(enemy, "Confused", 1, 1); fx.push({ kind: "status", target: "enemy", label: "Confused" }); logs.push("Tralalero confuses the boss."); },
    ];
    const triggers = isUlt ? 2 : 1;
    if (!isUlt && rng.chance(misfireChance)) {
      player.pendingEnergy -= 1;
      fx.push({ kind: "misfire", target: "player" });
      logs.push("Tralalero MISFIRES — lose 1 energy next turn!");
    } else {
      for (let i = 0; i < triggers; i++) rng.pick(positives)();
    }
    return { fx, logs, draw };
  }

  // ---- Self-damage (Wojak) ----
  if (e.selfDamage) {
    const sd = isUlt ? 1 : e.selfDamage;
    player.hp = Math.max(1, player.hp - sd);
    fx.push({ kind: "damage", target: "player", value: sd });
    logs.push(`${card.name} sacrifices ${sd} HP.`);
  }

  // ---- Damage ----
  if (e.damage) {
    const hits = e.hits ?? 1;
    let critChance = e.critChance ?? 0;
    // Mog Cat passive: higher crit vs low-HP enemies.
    if (hasPassive && card.id === "mog_cat" && enemy.hp / enemy.maxHp < 0.5) critChance = 0.5;
    // Mog Cat ultimate: guaranteed crit if boss has a debuff.
    if (isUlt && card.id === "mog_cat" && enemy.statuses.length > 0) critChance = 1;

    for (let h = 0; h < hits; h++) {
      let dmg = e.damage;
      // Combo damage (Dogwifhat): bonus if played after a damage card.
      if (e.comboDamage && lastWasDamage && h === 0) dmg += e.comboDamage;
      // Execute bonus.
      if (e.executeThreshold && e.executeBonus && enemy.hp / enemy.maxHp <= e.executeThreshold) {
        dmg += e.executeBonus;
      }
      // Hype / next-attack bonus consumed on first hit.
      if (h === 0) {
        if (player.hype) { dmg += HYPE_BONUS; player.hype = false; fx.push({ kind: "status", target: "player", label: "Hype!" }); }
        if (player.nextAttackBonus > 0) { dmg += player.nextAttackBonus; player.nextAttackBonus = 0; }
      }
      dmg = Math.round(dmg * eventBuff);

      const isCrit = player.guaranteedCrit || (critChance > 0 && rng.chance(critChance));
      if (isCrit) {
        const mult = resolved.level >= 4 ? 2.25 : 2;
        dmg = Math.round(dmg * mult);
        player.guaranteedCrit = false;
        damageEnemy(state, dmg);
        fx.push({ kind: "crit", target: "enemy", value: dmg });
        logs.push(`${card.name} CRITS for ${dmg}!`);
      } else {
        damageEnemy(state, dmg);
        fx.push({ kind: "damage", target: "enemy", value: dmg });
        logs.push(`${card.name} hits for ${dmg}.`);
      }
    }
  }

  // ---- Burn (apply to enemy) ----
  let burn = 0;
  if (card.id === "bombardino_crocodilo") burn = isUlt ? 3 : hasPassive ? 2 : 0;
  if (burn > 0) {
    addStatus(enemy, "Burn", burn, 3);
    fx.push({ kind: "status", target: "enemy", label: `Burn ${burn}` });
    logs.push(`${card.name} applies Burn ${burn}.`);
  }

  // ---- Stun ----
  if (e.stunChance) {
    let guaranteed = player.guaranteedStun;
    // Tung ultimate: guaranteed stun if played after 2 cards this turn.
    if (isUlt && player.cardsPlayedThisTurn >= 2) guaranteed = true;
    if (guaranteed || rng.chance(e.stunChance)) {
      addStatus(enemy, "Stun", 1, 1);
      player.guaranteedStun = false;
      fx.push({ kind: "stun", target: "enemy" });
      logs.push(`${card.name} STUNS the boss!`);
    }
  }

  // ---- Shield ----
  if (e.shield) {
    const shield = e.shield;
    player.shield += shield;
    fx.push({ kind: "shield", target: "player", value: shield });
    logs.push(`${card.name} grants ${shield} shield.`);
  }

  // ---- Heal ----
  if (e.heal) {
    player.hp = Math.min(player.maxHp, player.hp + e.heal);
    fx.push({ kind: "heal", target: "player", value: e.heal });
    logs.push(`${card.name} heals ${e.heal}.`);
  }
  // Pepe passive: heal 3 if below 40% HP.
  if (hasPassive && card.id === "pepe_the_frog" && player.hp / player.maxHp < 0.4) {
    player.hp = Math.min(player.maxHp, player.hp + 3);
    fx.push({ kind: "heal", target: "player", value: 3 });
    logs.push("Pepe's calm restores 3 HP.");
  }

  // ---- Status applied to enemy ----
  if (e.applyStatus) {
    for (const st of e.applyStatus) {
      const dur = isUlt && st === "Chill" ? 2 : 1;
      addStatus(enemy, st, 1, dur);
      fx.push({ kind: "status", target: "enemy", label: st });
      logs.push(`${card.name} applies ${st}.`);
    }
  }

  // ---- Energy next turn ----
  if (e.energyNextTurn) {
    const bonus = isUlt ? 2 : e.energyNextTurn;
    player.pendingEnergy += bonus;
    fx.push({ kind: "energy", target: "player", value: bonus });
    logs.push(`${card.name} banks ${bonus} energy for next turn.`);
  }

  // ---- Dodge ----
  if (e.dodge) {
    addStatus(player, "Dodge", e.dodge, -1);
    fx.push({ kind: "status", target: "player", label: "Dodge" });
    logs.push(`${card.name} grants Dodge.`);
  }

  // ---- Next-card discount ----
  if (e.nextCardDiscount) {
    player.nextCardDiscount += e.nextCardDiscount;
    logs.push(`Next card costs ${e.nextCardDiscount} less.`);
  }

  // ---- Hype grant (ultimates) ----
  if (isUlt && ["dogwifhat", "gigachad", "wojak"].includes(card.id)) {
    player.hype = true;
    fx.push({ kind: "status", target: "player", label: "Hype!" });
    logs.push(`${card.name} grants Hype!`);
  }

  // ---- Draw effects ----
  if (e.draw) draw += e.draw;
  if (isUlt && ["popcat", "peanut_the_squirrel", "ballerina_cappuccino"].includes(card.id)) draw += 1;
  if (hasPassive && card.id === "ballerina_cappuccino" && player.statuses.some((s) => s.type === "Dodge")) {
    draw += 1;
  }
  // Sigma Cat ultimate: cleanse 1 debuff.
  if (isUlt && card.id === "sigma_cat" && player.statuses.length) {
    const idx = player.statuses.findIndex((s) => ["Burn", "Confused", "Rugged"].includes(s.type));
    if (idx >= 0) {
      const removed = player.statuses.splice(idx, 1)[0];
      logs.push(`Sigma Cat cleanses ${removed.type}.`);
    }
  }

  return { fx, logs, draw };
}
