import type { GameModeId } from "@/types";
import type {
  ArenaBattleState,
  ArenaUnit,
  ArenaProjectile,
  ArenaHandCard,
  ArenaStatus,
  ArenaStatusType,
  ArenaFloat,
  ArenaFloatKind,
  Lane,
} from "@/types/arena";
import { createRng, makeSeed, type Rng } from "./rng";
import { resolveCard } from "./upgrades";
import { getArenaProfile } from "@/data/cardArenaProfiles";
import { createArenaUnit, createMinion } from "./arenaUnits";
import { getAbility, type AbilityContext } from "./arenaAbilities";
import { checkArenaCombos, type ComboHelpers } from "./arenaCombos";
import { runBossAI, damageBossCore } from "./arenaBossAI";
import { getArenaBoss } from "@/data/arenaBosses";
import { getBoss } from "@/data/bosses";
import { ARENA_CONFIG, ARENA_TIME_LIMIT } from "@/data/arenaEconomy";

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

export interface CreateArenaArgs {
  mode: GameModeId;
  bossId: string;
  deck: { card_id: string; level: number }[];
  seed?: string;
  wave?: number;
}

let floatCounter = 0;
let battleCounter = 0;

/** Units do reduced damage to the boss core so fights last ~60–120s. */
const BOSS_CORE_DMG_FACTOR = 0.45;

function buildHandCards(deck: { card_id: string; level: number }[]): ArenaHandCard[] {
  return deck
    .filter((d) => getArenaProfile(d.card_id))
    .map((d, i) => {
      const profile = getArenaProfile(d.card_id)!;
      const resolved = resolveCard(d.card_id, d.level);
      return {
        uid: `${d.card_id}_${i}`,
        cardId: d.card_id,
        level: d.level,
        cost: profile.deployCost ?? resolved?.cost ?? 3,
        deployCooldown: 0,
      };
    });
}

export function createArenaBattle(args: CreateArenaArgs): ArenaBattleState {
  const seed = args.seed ?? makeSeed();
  const cfg = ARENA_CONFIG;
  const arenaBoss = getArenaBoss(args.bossId);
  const legacyBoss = getBoss(args.bossId);
  const coreMax = arenaBoss?.coreMaxHp ?? (legacyBoss?.max_hp ?? 500) * 8;

  // Build cycling deck: 8 cards, 4 in hand.
  const allCards = buildHandCards(args.deck);
  const hand = allCards.slice(0, cfg.handSize);
  const deckCycle = allCards.slice(cfg.handSize);

  const state: ArenaBattleState = {
    battleId: `arena_${Date.now()}_${battleCounter++}`,
    mode: args.mode,
    seed,
    status: "playing",

    boss: {
      bossId: args.bossId,
      name: legacyBoss?.name ?? "Boss",
      coreHp: coreMax,
      coreMaxHp: coreMax,
      phase: 0,
      castTimer: 2600,
      intent: "…",
      windup: 0,
      windupTotal: 0,
    },
    playerBaseHp: cfg.playerBaseHp,
    playerBaseMaxHp: cfg.playerBaseHp,

    energy: cfg.startEnergy,
    maxEnergy: cfg.maxEnergy,
    energyAccumulator: 0,
    energyRegenPerSec: cfg.energyRegenPerSec,

    hand,
    deckCycle,
    units: [],
    projectiles: [],
    hazards: [],
    floats: [],
    decals: [],
    activeCombos: [],

    hype: 0,
    hypeReady: false,

    battleTime: 0,
    timeLimit: ARENA_TIME_LIMIT[args.mode] ?? 0,

    wave: args.wave ?? 0,
    waveTimer: cfg.survival.waveIntervalMs,
    awaitingWaveChoice: false,

    totalBossDamage: 0,
    unitsDeployed: 0,
    unitsLost: 0,
    combosTriggered: [],
    energySpent: 0,

    eventLog: [],
    actionLog: [{ t: 0, type: "start", detail: args.bossId }],
    recentDeploys: [],
    shake: 0,
    flash: null,
    flashTtl: 0,
    comboFlags: {},
  };

  log(state, `${state.boss.name} appears. Defend the base and crack the core!`, "system");
  return state;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function log(state: ArenaBattleState, text: string, kind: ArenaBattleState["eventLog"][number]["kind"]) {
  state.eventLog.push({ id: `el_${state.eventLog.length}`, t: state.battleTime, text, kind });
  if (state.eventLog.length > 60) state.eventLog.splice(0, state.eventLog.length - 60);
}

function makeFloat(
  state: ArenaBattleState,
  lane: Lane,
  position: number,
  owner: ArenaUnit["owner"],
  kind: ArenaFloatKind,
  value?: number,
  label?: string,
) {
  const f: ArenaFloat = {
    id: `f_${floatCounter++}`,
    lane, position, owner, kind, value, label, ttl: 850,
  };
  state.floats.push(f);
  if (state.floats.length > 40) state.floats.shift();
}

function addDecal(state: ArenaBattleState, lane: Lane, position: number, theme: string) {
  state.decals.push({
    id: `d_${floatCounter++}`, lane, position,
    theme: theme as never, ttl: 900, ttlTotal: 900,
  });
  if (state.decals.length > 30) state.decals.shift();
}

function hasStatus(unit: ArenaUnit, type: ArenaStatusType): boolean {
  return unit.statuses.some((s) => s.type === type && s.remaining > 0);
}
function getStatus(unit: ArenaUnit, type: ArenaStatusType): ArenaStatus | undefined {
  return unit.statuses.find((s) => s.type === type && s.remaining > 0);
}

function dirOf(owner: ArenaUnit["owner"]): 1 | -1 {
  return owner === "player" ? 1 : -1;
}

/* ------------------------------------------------------------------ */
/* Combat helpers (damage/shield/heal/status)                          */
/* ------------------------------------------------------------------ */

function damageUnit(state: ArenaBattleState, target: ArenaUnit, amount: number, crit = false): number {
  // Dodge consumes one stack (true dodge has amount 1 + remaining>1).
  const dodge = target.statuses.find((s) => s.type === "dodge" && s.amount >= 1 && s.remaining > 1);
  if (dodge) {
    dodge.amount -= 1;
    if (dodge.amount <= 0) dodge.remaining = 0;
    makeFloat(state, target.lane, target.position, target.owner, "miss", undefined, "DODGE");
    return 0;
  }
  let remaining = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
    if (absorbed > 0) {
      target.visualEvents.push("shielded");
      makeFloat(state, target.lane, target.position, target.owner, "shield", Math.round(absorbed));
    }
  }
  const before = target.hp;
  target.hp = Math.max(0, target.hp - remaining);
  const removed = before - target.hp;
  if (remaining > 0) {
    target.visualEvents.push("hit");
    makeFloat(state, target.lane, target.position, target.owner, crit ? "crit" : "damage", Math.round(amount));
  }
  return removed;
}

function shieldUnit(state: ArenaBattleState, target: ArenaUnit, amount: number) {
  target.shield = Math.min(target.maxHp * 1.5, target.shield + amount);
}
function healUnit(state: ArenaBattleState, target: ArenaUnit, amount: number) {
  target.hp = Math.min(target.maxHp, target.hp + amount);
  makeFloat(state, target.lane, target.position, target.owner, "heal", Math.round(amount));
}

function applyStatus(target: ArenaUnit, type: ArenaStatusType, durationMs: number, amount = 0) {
  if (hasStatus(target, "unstoppable") && (type === "stun" || type === "slow" || type === "confuse" || type === "taunt")) return;
  const existing = target.statuses.find((s) => s.type === type);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, durationMs);
    existing.amount = Math.max(existing.amount, amount);
  } else {
    target.statuses.push({ type, remaining: durationMs, amount });
  }
}

/* ------------------------------------------------------------------ */
/* Targeting                                                           */
/* ------------------------------------------------------------------ */

function enemiesOf(state: ArenaBattleState, unit: ArenaUnit): ArenaUnit[] {
  return state.units.filter((u) => u.owner !== unit.owner && u.lane === unit.lane && u.hp > 0);
}
function alliesOf(state: ArenaBattleState, unit: ArenaUnit): ArenaUnit[] {
  return state.units.filter((u) => u.owner === unit.owner && u.id !== unit.id && u.lane === unit.lane && u.hp > 0);
}

function nearestEnemyAhead(state: ArenaBattleState, unit: ArenaUnit, range: number): ArenaUnit | null {
  const dir = dirOf(unit.owner);
  let best: ArenaUnit | null = null;
  let bestDist = Infinity;
  for (const e of enemiesOf(state, unit)) {
    const ahead = dir === 1 ? e.position >= unit.position - 2 : e.position <= unit.position + 2;
    const dist = Math.abs(e.position - unit.position);
    if (ahead && dist <= range && dist < bestDist) {
      best = e;
      bestDist = dist;
    }
  }
  return best;
}

function lowestHpEnemyInRange(state: ArenaBattleState, unit: ArenaUnit, range: number): ArenaUnit | null {
  let best: ArenaUnit | null = null;
  for (const e of enemiesOf(state, unit)) {
    if (Math.abs(e.position - unit.position) <= range) {
      if (!best || e.hp < best.hp) best = e;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Ability context factory                                             */
/* ------------------------------------------------------------------ */

function makeAbilityCtx(state: ArenaBattleState, dt: number): AbilityContext {
  return {
    state,
    dt,
    damageUnit: (t, a, opts) => damageUnit(state, t, a, opts?.crit),
    damageBoss: (a, opts) => {
      const removed = damageBossCore(state, a);
      state.totalBossDamage += removed;
      makeFloat(state, 1, 100, "player", opts?.crit ? "crit" : "damage", Math.round(a));
    },
    shieldUnit: (t, a) => shieldUnit(state, t, a),
    healUnit: (t, a) => healUnit(state, t, a),
    applyStatus: (t, type, dur, amt) => applyStatus(t, type, dur, amt),
    alliesInLane: (u, range = 100) => alliesOf(state, u).filter((a) => Math.abs(a.position - u.position) <= range),
    enemiesInLane: (u, range = 100) => enemiesOf(state, u).filter((e) => Math.abs(e.position - u.position) <= range),
    nearestEnemy: (u, range = u.attackRange) => nearestEnemyAhead(state, u, range),
    lowestHpEnemy: (u, range = 30) => lowestHpEnemyInRange(state, u, range),
    fireProjectile: (u, target, opts) => spawnProjectile(state, u, target, opts),
    decal: (lane, pos, theme) => addDecal(state, lane, pos, theme),
    float: (u, kind, value, label) => makeFloat(state, u.lane, u.position, u.owner, kind, value, label),
    grantEnergy: (a) => { state.energy = Math.min(state.maxEnergy, state.energy + a); },
    addHype: (a) => addHype(state, a),
    flash: (p) => doFlash(state, p),
    shake: (a) => { state.shake = Math.min(1, state.shake + a); },
    visual: (u, ev) => u.visualEvents.push(ev),
    log: (text, kind) => log(state, text, kind),
  };
}

function spawnProjectile(
  state: ArenaBattleState,
  unit: ArenaUnit,
  target: ArenaUnit | null,
  opts: { damage: number; speed: number; effect: ArenaProjectile["effectType"] },
) {
  const toPos = target ? target.position : unit.position + dirOf(unit.owner) * unit.attackRange;
  state.projectiles.push({
    id: `pr_${floatCounter++}`,
    sourceUnitId: unit.id,
    owner: unit.owner,
    lane: unit.lane,
    fromPosition: unit.position,
    toPosition: toPos,
    currentPosition: unit.position,
    damage: opts.damage,
    speed: opts.speed,
    effectType: opts.effect,
    targetId: target?.id ?? null,
  });
}

function addHype(state: ArenaBattleState, amount: number) {
  state.hype = Math.min(ARENA_CONFIG.hypeMax, state.hype + amount);
  if (state.hype >= ARENA_CONFIG.hypeMax) state.hypeReady = true;
}

function doFlash(state: ArenaBattleState, palette: string) {
  state.flash = palette;
  state.flashTtl = 500;
}

/* ------------------------------------------------------------------ */
/* Deployment                                                          */
/* ------------------------------------------------------------------ */

export interface DeployResult {
  ok: boolean;
  reason?: "energy" | "cooldown" | "not_found" | "zone";
}

export function deployCard(state: ArenaBattleState, uid: string, lane: Lane): DeployResult {
  if (state.status !== "playing") return { ok: false, reason: "not_found" };
  const idx = state.hand.findIndex((c) => c.uid === uid);
  if (idx < 0) return { ok: false, reason: "not_found" };
  const card = state.hand[idx];
  if (card.deployCooldown > 0) return { ok: false, reason: "cooldown" };
  if (state.energy < card.cost) return { ok: false, reason: "energy" };

  const profile = getArenaProfile(card.cardId);
  if (!profile) return { ok: false, reason: "not_found" };

  state.energy -= card.cost;
  state.energySpent += card.cost;
  addHype(state, card.cost * ARENA_CONFIG.hypePerEnergy);
  state.unitsDeployed += 1;
  state.recentDeploys.push({ cardId: card.cardId, t: state.battleTime });
  if (state.recentDeploys.length > 12) state.recentDeploys.shift();
  state.actionLog.push({ t: state.battleTime, type: profile.cardType === "spell" ? "cast" : "deploy", cardId: card.cardId, lane });

  if (profile.cardType === "spell") {
    castAirstrike(state, card.cardId, card.level, lane);
    log(state, `Airstrike called on lane ${lane + 1}.`, "player");
  } else {
    const unit = createArenaUnit({
      cardId: card.cardId, level: card.level, owner: "player",
      lane, position: 6, battleTime: state.battleTime,
    });
    state.units.push(unit);
    const ability = getAbility(card.cardId);
    if (ability?.onSpawn) ability.onSpawn(unit, makeAbilityCtx(state, 0));
    addDecal(state, lane, 6, "ability");
    log(state, `Deployed ${profile.unitType} in lane ${lane + 1}.`, "player");
  }

  // Cycle: card goes to back of deck, next slides into hand.
  card.deployCooldown = ARENA_CONFIG.deployCooldownMs;
  state.hand.splice(idx, 1);
  state.deckCycle.push(card);
  const next = state.deckCycle.shift();
  if (next) state.hand.splice(idx, 0, next);

  return { ok: true };
}

function castAirstrike(state: ArenaBattleState, cardId: string, level: number, lane: Lane) {
  const big = level >= 5;
  const dmg = (big ? 80 : 55) + level * 6;
  state.hazards.push({
    id: `hz_air_${floatCounter++}`,
    owner: "player",
    lane,
    startPosition: 6,
    endPosition: big ? 98 : 86,
    warning: 800,
    active: 500,
    warningTotal: 800,
    activeTotal: 500,
    damagePerTick: dmg,
    tickInterval: 500,
    tickAccumulator: 0,
    effect: "explosion",
    theme: "fire",
    applyStatus: level >= 3 ? "burn" : undefined,
  });
}

/* ------------------------------------------------------------------ */
/* Per-tick simulation                                                 */
/* ------------------------------------------------------------------ */

const STATUS_DECAY: ArenaStatusType[] = ["stun", "slow", "burn", "confuse", "taunt", "haste", "crit_buff", "unstoppable", "dodge"];

function updateStatuses(state: ArenaBattleState, unit: ArenaUnit, dt: number) {
  for (const s of unit.statuses) {
    if (s.remaining < 99000) s.remaining -= dt;
    if (s.type === "burn" && s.remaining > 0) {
      // burn ticks ~ every tick scaled by dt
      damageUnit(state, unit, (s.amount || 4) * (dt / 1000) * 3, false);
    }
  }
  unit.statuses = unit.statuses.filter((s) => s.remaining > 0 || STATUS_DECAY.indexOf(s.type) < 0);
}

function effectiveMoveSpeed(unit: ArenaUnit): number {
  let mul = 1;
  const slow = getStatus(unit, "slow");
  if (slow) mul *= 1 - Math.min(0.8, slow.amount || 0.4);
  if (hasStatus(unit, "haste")) mul *= 1 + (getStatus(unit, "haste")?.amount || 0.25);
  return unit.moveSpeed * mul;
}
function effectiveAttackSpeed(unit: ArenaUnit): number {
  let mul = 1;
  if (hasStatus(unit, "haste")) mul *= 1 + (getStatus(unit, "haste")?.amount || 0.25);
  const slow = getStatus(unit, "slow");
  if (slow) mul *= 1 - Math.min(0.6, slow.amount || 0.4) * 0.5;
  return unit.attackSpeed * mul;
}

function updateUnit(state: ArenaBattleState, unit: ArenaUnit, dt: number) {
  unit.moving = false;
  if (unit.attackCooldown > 0) unit.attackCooldown -= dt;
  for (const k of Object.keys(unit.cooldowns)) {
    if (unit.cooldowns[k] > 0) unit.cooldowns[k] -= dt;
  }
  updateStatuses(state, unit, dt);
  if (unit.hp <= 0) return;

  // Stun/confuse halt action.
  if (hasStatus(unit, "stun")) return;

  const ability = getAbility(unit.cardId);
  const ctx = makeAbilityCtx(state, dt);

  // Special abilities fire on their own cadence.
  if (ability?.onSpecial) ability.onSpecial(unit, ctx);

  const dir = dirOf(unit.owner);

  // Support/ranged units that want to hang back: find target in range.
  const target = nearestEnemyAhead(state, unit, unit.attackRange);
  const atBossLine = unit.owner === "player" && unit.position >= 96;
  const atPlayerBase = unit.owner === "enemy" && unit.position <= 4;

  // Taunt: enemy must move toward / attack the taunting decoy if present.
  if (hasStatus(unit, "taunt")) {
    // taunted enemies keep moving toward player base normally; taunt mostly
    // makes them prefer the decoy which is handled by lane targeting already.
  }

  if (target && unit.cardType !== "spell") {
    // In range → attack instead of moving.
    if (unit.attackCooldown <= 0) {
      resolveBasicAttack(state, unit, target, ctx, ability);
      unit.attackCooldown = 1000 / Math.max(0.2, effectiveAttackSpeed(unit));
    }
    return;
  }

  if (atBossLine) {
    // Attack the boss core. A reduction factor keeps "cracking the core" a
    // sustained objective rather than an instant melt from a few big units.
    if (unit.attackCooldown <= 0) {
      let mult = 1;
      if (ability?.damageMod) mult *= ability.damageMod(unit, "boss", ctx);
      const crit = hasStatus(unit, "crit_buff") || (ability?.forceCrit?.(unit, "boss", ctx) ?? false);
      const dmg = unit.damage * mult * (crit ? 2 : 1) * BOSS_CORE_DMG_FACTOR;
      const removed = damageBossCore(state, dmg);
      state.totalBossDamage += removed;
      addHype(state, removed * ARENA_CONFIG.hypePerBossDamage);
      unit.visualEvents.push("attack");
      makeFloat(state, unit.lane, 100, "player", crit ? "crit" : "damage", Math.round(dmg));
      if (ability?.onAttack) ability.onAttack(unit, "boss", ctx);
      unit.attackCooldown = 1000 / Math.max(0.2, effectiveAttackSpeed(unit));
      if (crit) consumeCritBuff(unit);
    }
    return;
  }

  if (atPlayerBase) {
    if (unit.attackCooldown <= 0) {
      state.playerBaseHp = Math.max(0, state.playerBaseHp - unit.damage);
      unit.visualEvents.push("attack");
      makeFloat(state, unit.lane, 0, "enemy", "damage", Math.round(unit.damage));
      state.shake = Math.min(1, state.shake + 0.15);
      unit.attackCooldown = 1000 / Math.max(0.2, effectiveAttackSpeed(unit));
    }
    return;
  }

  // Otherwise move along the lane.
  const speed = effectiveMoveSpeed(unit);
  unit.position = Math.max(0, Math.min(100, unit.position + dir * speed * (dt / 1000)));
  unit.moving = true;
}

function consumeCritBuff(unit: ArenaUnit) {
  const cb = unit.statuses.find((s) => s.type === "crit_buff");
  if (cb) cb.remaining = 0;
}

function resolveBasicAttack(
  state: ArenaBattleState,
  unit: ArenaUnit,
  target: ArenaUnit,
  ctx: AbilityContext,
  ability: ReturnType<typeof getAbility>,
) {
  unit.visualEvents.push("attack");
  let mult = 1;
  if (ability?.damageMod) mult *= ability.damageMod(unit, target, ctx);
  const crit = hasStatus(unit, "crit_buff") || (ability?.forceCrit?.(unit, target, ctx) ?? false);
  const dmg = unit.damage * mult * (crit ? 2 : 1);

  const isRanged = unit.role === "ranged" || unit.attackRange >= 18;
  if (isRanged) {
    const effect = unit.cardId === "popcat" ? "pop" : unit.cardId.includes("tralalero") ? "note" : unit.cardId === "peanut_the_squirrel" ? "acorn" : "bolt";
    spawnProjectile(state, unit, target, { damage: dmg, speed: 60, effect: effect as never });
  } else {
    damageUnit(state, target, dmg, crit);
  }
  if (crit) consumeCritBuff(unit);
  if (ability?.onAttack) ability.onAttack(unit, target, ctx);
}

function updateProjectiles(state: ArenaBattleState, dt: number) {
  for (const p of state.projectiles) {
    const dir = p.toPosition >= p.fromPosition ? 1 : -1;
    p.currentPosition += dir * p.speed * (dt / 1000);
    const target = p.targetId ? state.units.find((u) => u.id === p.targetId && u.hp > 0) : null;
    const reachTarget = target && Math.abs(p.currentPosition - target.position) <= 4;
    const reachEnd = dir === 1 ? p.currentPosition >= p.toPosition : p.currentPosition <= p.toPosition;
    if (reachTarget && target) {
      damageUnit(state, target, p.damage, false);
      p.currentPosition = -999; // mark for removal
    } else if (reachEnd) {
      if (target) damageUnit(state, target, p.damage, false);
      p.currentPosition = -999;
    }
  }
  state.projectiles = state.projectiles.filter((p) => p.currentPosition > -900);
}

function updateHazards(state: ArenaBattleState, dt: number) {
  for (const hz of state.hazards) {
    if (hz.warning > 0) {
      hz.warning -= dt;
      continue;
    }
    hz.active -= dt;
    hz.tickAccumulator += dt;
    if (hz.tickAccumulator >= hz.tickInterval) {
      hz.tickAccumulator -= hz.tickInterval;
      const victims = state.units.filter(
        (u) =>
          u.lane === hz.lane &&
          u.hp > 0 &&
          u.owner !== hz.owner &&
          u.position >= hz.startPosition &&
          u.position <= hz.endPosition,
      );
      for (const v of victims) {
        damageUnit(state, v, hz.damagePerTick, false);
        if (hz.applyStatus) applyStatus(v, hz.applyStatus, 1200, hz.effect === "slow" || hz.effect === "drain" ? 0.5 : 0);
      }
      // Enemy hazards near the player base also chip the base + drain energy.
      if (hz.owner === "enemy") {
        if (hz.effect === "drain" && hz.startPosition <= 8) {
          state.energy = Math.max(0, state.energy - 0.4);
        }
      }
    }
    if (hz.active <= 0) addDecal(state, hz.lane, (hz.startPosition + hz.endPosition) / 2, hz.theme);
  }
  state.hazards = state.hazards.filter((hz) => hz.warning > 0 || hz.active > 0);
}

function removeDeadUnits(state: ArenaBattleState) {
  const survivors: ArenaUnit[] = [];
  for (const u of state.units) {
    if (u.hp > 0) {
      survivors.push(u);
      continue;
    }
    u.visualEvents.push("death");
    addDecal(state, u.lane, u.position, "death");
    const ability = getAbility(u.cardId);
    if (ability?.onDeath) ability.onDeath(u, makeAbilityCtx(state, 0));
    if (u.owner === "player") state.unitsLost += 1;
  }
  state.units = survivors;
}

/* ------------------------------------------------------------------ */
/* Survival waves                                                      */
/* ------------------------------------------------------------------ */

function updateSurvival(state: ArenaBattleState, dt: number) {
  if (state.mode !== "survival") return;
  if (state.awaitingWaveChoice) return;
  state.waveTimer -= dt;
  if (state.waveTimer <= 0) {
    state.wave += 1;
    state.waveTimer = ARENA_CONFIG.survival.waveIntervalMs;
    spawnSurvivalWave(state);
    log(state, `Wave ${state.wave} incoming!`, "boss");
    doFlash(state, "red");
    if (state.wave % ARENA_CONFIG.survival.rewardEveryWaves === 0) {
      state.awaitingWaveChoice = true;
    }
  }
}

function spawnSurvivalWave(state: ArenaBattleState) {
  const w = state.wave;
  const hpScale = 1 + 0.16 * (w - 1);
  const count = 2 + Math.floor(w / 2);
  const isBossWave = w % ARENA_CONFIG.survival.bossMiniWaveEvery === 0;
  for (let i = 0; i < count; i++) {
    const lane = ((i + w) % 3) as Lane;
    state.units.push(
      createMinion({
        cardId: "_wave", lane, position: 100 - i * 3, battleTime: state.battleTime, role: "melee",
        hp: Math.round(34 * hpScale), damage: Math.round(7 * (1 + 0.08 * w)),
        attackSpeed: 1, moveSpeed: 11, attackRange: 6, rarity: isBossWave ? "Epic" : "Common",
      }),
    );
  }
  if (isBossWave) {
    for (const lane of [0, 1, 2] as Lane[]) {
      state.units.push(
        createMinion({
          cardId: "_brute", lane, position: 98, battleTime: state.battleTime, role: "tank",
          hp: Math.round(120 * hpScale), damage: Math.round(14 * (1 + 0.08 * w)),
          attackSpeed: 0.7, moveSpeed: 7, attackRange: 6, rarity: "Legendary",
        }),
      );
    }
    state.shake = 0.6;
  }
}

export function chooseWaveReward(state: ArenaBattleState, choice: "energy" | "heal" | "hype") {
  if (choice === "energy") state.maxEnergy = Math.min(14, state.maxEnergy + 1);
  if (choice === "heal") state.playerBaseHp = Math.min(state.playerBaseMaxHp, state.playerBaseHp + state.playerBaseMaxHp * 0.3);
  if (choice === "hype") addHype(state, 50);
  state.awaitingWaveChoice = false;
}

/* ------------------------------------------------------------------ */
/* Main tick                                                           */
/* ------------------------------------------------------------------ */

let cachedRng: { seed: string; rng: Rng } | null = null;
function rngFor(state: ArenaBattleState): Rng {
  if (!cachedRng || cachedRng.seed !== state.seed) {
    cachedRng = { seed: state.seed, rng: createRng(state.seed + "_boss") };
  }
  return cachedRng.rng;
}

/** Advance the whole simulation by `dt` ms. Mutates and returns state. */
export function tickArenaBattle(state: ArenaBattleState, dt: number): ArenaBattleState {
  if (state.status !== "playing" || state.awaitingWaveChoice) return state;
  // Clamp dt so background-tab catch-up doesn't explode the sim.
  dt = Math.min(dt, 120);
  state.battleTime += dt;

  // Energy regen.
  state.energyAccumulator += state.energyRegenPerSec * (dt / 1000);
  while (state.energyAccumulator >= 1 && state.energy < state.maxEnergy) {
    state.energy = Math.min(state.maxEnergy, state.energy + 1);
    state.energyAccumulator -= 1;
  }
  if (state.energy >= state.maxEnergy) state.energyAccumulator = 0;

  // Hand deploy cooldowns.
  for (const c of state.hand) if (c.deployCooldown > 0) c.deployCooldown = Math.max(0, c.deployCooldown - dt);

  // Boss brain.
  runBossAI(state, dt, rngFor(state), {
    log: (text, kind) => log(state, text, kind),
    flash: (p) => doFlash(state, p),
    shake: (a) => { state.shake = Math.min(1, state.shake + a); },
  });

  // Units.
  // Snapshot ids so newly-spawned clones don't act on their spawn tick.
  const acting = state.units.filter((u) => u.hp > 0);
  for (const u of acting) updateUnit(state, u, dt);

  updateProjectiles(state, dt);
  updateHazards(state, dt);
  removeDeadUnits(state);

  // Cap player units per lane / total for readability.
  enforceUnitCaps(state);

  // Combos.
  const combos = checkArenaCombos(state, makeComboHelpers(state));
  for (const id of combos) state.actionLog.push({ t: state.battleTime, type: "combo", detail: id });

  // Active combo banner timers.
  for (const c of state.activeCombos) {
    c.bannerRemaining -= dt;
    c.effectRemaining -= dt;
  }
  state.activeCombos = state.activeCombos.filter((c) => c.bannerRemaining > 0 || c.effectRemaining > 0);

  // Combo cooldowns decay.
  for (const k of Object.keys(state.comboFlags)) {
    if (k.startsWith("combo_cd_") && state.comboFlags[k] > 0) {
      state.comboFlags[k] = Math.max(0, state.comboFlags[k] - dt);
    }
  }

  // Floats / decals / flash / shake decay.
  for (const f of state.floats) f.ttl -= dt;
  state.floats = state.floats.filter((f) => f.ttl > 0);
  for (const d of state.decals) d.ttl -= dt;
  state.decals = state.decals.filter((d) => d.ttl > 0);
  if (state.flashTtl > 0) { state.flashTtl -= dt; if (state.flashTtl <= 0) state.flash = null; }
  state.shake = Math.max(0, state.shake - dt / 400);

  // Hype meter readiness.
  if (state.hype >= ARENA_CONFIG.hypeMax) state.hypeReady = true;

  updateSurvival(state, dt);
  checkWinLoss(state);
  return state;
}

function makeComboHelpers(state: ArenaBattleState): ComboHelpers {
  return {
    damageUnit: (t, a) => damageUnit(state, t, a, false),
    applyStatus: (t, type, dur, amt) => applyStatus(t, type, dur, amt),
    shieldUnit: (t, a) => shieldUnit(state, t, a),
    grantEnergy: (a) => { state.energy = Math.min(state.maxEnergy, state.energy + a); },
    healBase: (a) => { state.playerBaseHp = Math.min(state.playerBaseMaxHp, state.playerBaseHp + a); },
    flash: (p) => doFlash(state, p),
    shake: (a) => { state.shake = Math.min(1, state.shake + a); },
    log: (text) => log(state, text, "combo"),
  };
}

function enforceUnitCaps(state: ArenaBattleState) {
  for (const lane of [0, 1, 2] as Lane[]) {
    const players = state.units.filter((u) => u.owner === "player" && u.lane === lane);
    if (players.length > ARENA_CONFIG.maxPlayerUnitsPerLane) {
      // Remove the oldest (furthest back, lowest position) excess.
      players
        .sort((a, b) => a.bornAt - b.bornAt)
        .slice(0, players.length - ARENA_CONFIG.maxPlayerUnitsPerLane)
        .forEach((u) => { u.hp = 0; });
      removeDeadUnits(state);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Hype / Ultimate                                                     */
/* ------------------------------------------------------------------ */

export function activateHype(state: ArenaBattleState) {
  if (!state.hypeReady) return;
  state.hypeReady = false;
  state.hype = 0;
  doFlash(state, "gold");
  state.shake = 0.6;
  // Empower all player units briefly + small base heal.
  for (const u of state.units) {
    if (u.owner === "player") {
      applyStatus(u, "haste", 4000, 0.4);
      applyStatus(u, "crit_buff", 4000, 0);
      shieldUnit(state, u, u.maxHp * 0.3);
    }
  }
  state.playerBaseHp = Math.min(state.playerBaseMaxHp, state.playerBaseHp + state.playerBaseMaxHp * 0.1);
  log(state, "HYPE UNLEASHED — units empowered!", "combo");
}

/* ------------------------------------------------------------------ */
/* Win / loss                                                          */
/* ------------------------------------------------------------------ */

function checkWinLoss(state: ArenaBattleState) {
  if (state.status !== "playing") return;
  if (state.playerBaseHp <= 0) {
    state.status = "lost";
    log(state, "Your base has fallen.", "system");
    state.actionLog.push({ t: state.battleTime, type: "end", detail: "loss" });
    return;
  }
  if (state.mode === "survival") {
    // Survival never "wins"; it ends on base death or manual cash-out.
    return;
  }
  if (state.boss.coreHp <= 0) {
    state.status = "won";
    log(state, `${state.boss.name} core destroyed. Victory!`, "system");
    state.actionLog.push({ t: state.battleTime, type: "end", detail: "win" });
    return;
  }
  if (state.timeLimit > 0 && state.battleTime >= state.timeLimit) {
    // Time out: daily/event reward partial — treat as loss for win-flag,
    // but scoring still credits boss damage.
    state.status = state.boss.coreHp < state.boss.coreMaxHp * 0.001 ? "won" : "lost";
    log(state, "Time! The arena resolves.", "system");
    state.actionLog.push({ t: state.battleTime, type: "end", detail: state.status });
  }
}

/** Force-end (manual exit / survival cash-out). */
export function endArenaBattle(state: ArenaBattleState, outcome: "won" | "lost") {
  if (state.status === "playing") {
    state.status = outcome;
    state.actionLog.push({ t: state.battleTime, type: "end", detail: outcome });
  }
}
