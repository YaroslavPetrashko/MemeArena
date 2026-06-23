import type { ArenaBattleState, ArenaUnit, Lane } from "@/types/arena";
import { ARENA_COMBOS, type ArenaComboDef } from "@/data/arenaCombos";
import { getArenaProfile } from "@/data/cardArenaProfiles";
import { createArenaUnit } from "./arenaUnits";

/** Combo cooldown bookkeeping lives on the state's comboFlags map. */
function comboKey(id: string) {
  return `combo_cd_${id}`;
}

function activeCardIds(state: ArenaBattleState): Set<string> {
  const s = new Set<string>();
  for (const u of state.units) if (u.owner === "player") s.add(u.cardId);
  return s;
}

function deployedWithin(state: ArenaBattleState, cardIds: string[], windowMs: number): boolean {
  const now = state.battleTime;
  return cardIds.every((id) =>
    state.recentDeploys.some((d) => d.cardId === id && now - d.t <= windowMs),
  );
}

function lanesOf(state: ArenaBattleState, cardIds: string[]): Lane[] {
  const lanes = new Set<Lane>();
  for (const u of state.units) {
    if (u.owner === "player" && cardIds.includes(u.cardId)) lanes.add(u.lane);
  }
  return [...lanes];
}

function shouldTrigger(state: ArenaBattleState, def: ArenaComboDef): boolean {
  const t = def.trigger;
  switch (t.kind) {
    case "deployed_within":
      return deployedWithin(state, t.cardIds, t.windowMs);
    case "both_active":
    case "all_active": {
      const active = activeCardIds(state);
      return t.cardIds.every((id) => active.has(id));
    }
    case "ability_count":
      return (state.comboFlags.tung_drum_stun ?? 0) >= t.count;
    case "death_while_active": {
      const diedAt = state.comboFlags.wojak_died ?? 0;
      const active = activeCardIds(state);
      return diedAt > 0 && state.battleTime - diedAt < 600 && active.has(t.activeCardId);
    }
    case "reached_boss_while_active": {
      const reachedAt = state.comboFlags.peanut_reached ?? 0;
      const active = activeCardIds(state);
      return reachedAt > 0 && state.battleTime - reachedAt < 600 && active.has(t.activeCardId);
    }
  }
}

export interface ComboHelpers {
  damageUnit: (target: ArenaUnit, amount: number) => void;
  applyStatus: (target: ArenaUnit, type: import("@/types/arena").ArenaStatusType, durationMs: number, amount?: number) => void;
  shieldUnit: (target: ArenaUnit, amount: number) => void;
  grantEnergy: (amount: number) => void;
  healBase: (amount: number) => void;
  flash: (palette: string) => void;
  shake: (amount: number) => void;
  log: (text: string, kind: "combo") => void;
}

/** Detect + fire combos. Mutates state; returns ids that fired this tick. */
export function checkArenaCombos(state: ArenaBattleState, h: ComboHelpers): string[] {
  const fired: string[] = [];
  for (const def of ARENA_COMBOS) {
    const cdLeft = state.comboFlags[comboKey(def.id)] ?? 0;
    if (cdLeft > 0) continue;
    if (!shouldTrigger(state, def)) continue;

    applyCombo(state, def, h);
    state.comboFlags[comboKey(def.id)] = def.cooldownMs;
    fired.push(def.id);

    // Consume one-shot triggers so they don't re-fire instantly.
    if (def.trigger.kind === "ability_count") state.comboFlags.tung_drum_stun = 0;
    if (def.trigger.kind === "death_while_active") state.comboFlags.wojak_died = 0;
    if (def.trigger.kind === "reached_boss_while_active") state.comboFlags.peanut_reached = 0;
  }
  return fired;
}

function applyCombo(state: ArenaBattleState, def: ArenaComboDef, h: ComboHelpers) {
  const e = def.effect;
  const targetLanes: Lane[] =
    e.allLanes || def.trigger.kind === "ability_count"
      ? [0, 1, 2]
      : lanesOf(state, "cardIds" in def.trigger ? def.trigger.cardIds : []);
  const lanes = targetLanes.length ? targetLanes : ([0, 1, 2] as Lane[]);

  const enemiesInLanes = state.units.filter((u) => u.owner === "enemy" && lanes.includes(u.lane));
  const alliesInLanes = state.units.filter((u) => u.owner === "player" && lanes.includes(u.lane));

  if (e.laneDamage) for (const en of enemiesInLanes) h.damageUnit(en, e.laneDamage);
  if (e.applyEnemyStatus) {
    for (const en of enemiesInLanes) {
      h.applyStatus(en, e.applyEnemyStatus.type, e.applyEnemyStatus.durationMs, e.applyEnemyStatus.amount);
    }
  }
  if (e.allyShield) for (const a of alliesInLanes) h.shieldUnit(a, e.allyShield);
  if (e.allyCrit) for (const a of alliesInLanes) h.applyStatus(a, "crit_buff", e.allyCrit.durationMs, 0);
  if (e.allyHaste) {
    for (const a of alliesInLanes) {
      const profile = getArenaProfile(a.cardId);
      if (profile?.synergyTags.includes(e.allyHaste.tag)) {
        h.applyStatus(a, "haste", e.allyHaste.durationMs, 0.2);
      }
    }
  }
  if (e.baseHeal) h.healBase(e.baseHeal);
  if (e.energy) h.grantEnergy(e.energy);
  if (e.spawnClone) {
    const lane = lanes[0] ?? 1;
    const clone = createArenaUnit({
      cardId: e.spawnClone, level: 3, owner: "player", lane,
      position: 30, battleTime: state.battleTime,
    });
    clone.abilityState.clone = 1;
    state.units.push(clone);
  }

  // Cinematic + register active combo.
  state.activeCombos.push({
    id: def.id,
    name: def.name,
    bannerRemaining: 1400,
    effectRemaining: Math.max(e.allyHaste?.durationMs ?? 0, e.allyCrit?.durationMs ?? 0, 1400),
    palette: def.palette,
    cardIds: "cardIds" in def.trigger ? def.trigger.cardIds : [def.trigger.kind === "ability_count" ? def.trigger.cardId : ""],
  });
  if (!state.combosTriggered.includes(def.id)) state.combosTriggered.push(def.id);
  h.flash(def.palette);
  h.shake(0.4);
  h.log(def.banner, "combo");
}
