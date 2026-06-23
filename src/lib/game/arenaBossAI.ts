import type {
  ArenaBattleState,
  ArenaHazard,
  Lane,
  BossPhase,
} from "@/types/arena";
import type { Rng } from "./rng";
import { getArenaBoss, type BossCast, type ArenaBossDef } from "@/data/arenaBosses";
import { createMinion } from "./arenaUnits";

let hazardCounter = 0;
function hazardId() {
  return `hz_${hazardCounter++}`;
}

type LaneSpec = "random" | "all" | { spread: number };

function pickLanes(spec: LaneSpec, rng: Rng, stackLane?: Lane): Lane[] {
  const all: Lane[] = [0, 1, 2];
  if (spec === "all") return all;
  if (spec === "random") return [rng.pick(all)];
  const n = Math.min(3, spec.spread);
  const pool = [...all];
  const out: Lane[] = [];
  // Stop-hunt style: bias first pick toward the player's most-stacked lane.
  if (stackLane !== undefined) {
    out.push(stackLane);
    pool.splice(pool.indexOf(stackLane), 1);
  }
  while (out.length < n && pool.length) {
    const i = Math.floor(rng.next() * pool.length);
    out.push(pool[i]);
    pool.splice(i, 1);
  }
  return out;
}

function mostStackedPlayerLane(state: ArenaBattleState): Lane {
  const counts = [0, 0, 0];
  for (const u of state.units) if (u.owner === "player") counts[u.lane]++;
  let best: Lane = 0;
  for (let l = 1 as Lane; l < 3; l = (l + 1) as Lane) if (counts[l] > counts[best]) best = l;
  return best;
}

function weightedCast(def: ArenaBossDef, phase: BossPhase, rng: Rng): BossCast {
  // Higher phases bias toward higher-impact (lower-weight) casts a bit.
  const total = def.casts.reduce((a, c) => a + c.weight, 0);
  let r = rng.next() * total;
  for (const c of def.casts) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return def.casts[def.casts.length - 1];
}

/** Choose + telegraph the next boss cast (sets intent + windup). */
function scheduleCast(state: ArenaBattleState, def: ArenaBossDef, rng: Rng) {
  const cast = weightedCast(def, state.boss.phase, rng);
  state.boss.intent = cast.intent;
  const windup = cast.kind === "hazard" ? cast.warningMs : 700;
  state.boss.windup = windup;
  state.boss.windupTotal = windup;
  state.boss.castTimer = windup;
  // Stash the chosen cast id for resolution.
  state.boss.intent = cast.intent;
  (state.boss as unknown as { _pendingCastId?: string })._pendingCastId = cast.id;
}

function resolveCast(state: ArenaBattleState, def: ArenaBossDef, rng: Rng, log: (t: string) => void) {
  const pendingId = (state.boss as unknown as { _pendingCastId?: string })._pendingCastId;
  const cast = def.casts.find((c) => c.id === pendingId) ?? def.casts[0];

  if (cast.kind === "buff") {
    state.actionLog.push({ t: state.battleTime, type: "boss_cast", detail: cast.id });
    if (cast.heal) state.boss.coreHp = Math.min(state.boss.coreMaxHp, state.boss.coreHp + cast.heal);
    if (cast.coreShield) {
      const bs = state.boss as unknown as { coreShield?: number };
      bs.coreShield = (bs.coreShield ?? 0) + cast.coreShield;
    }
    log(cast.name);
    return;
  }

  const stackLane = mostStackedPlayerLane(state);
  const lanes = pickLanes(cast.lanes, rng, cast.id === "stop_hunt" ? stackLane : undefined);

  state.actionLog.push({ t: state.battleTime, type: "boss_cast", detail: cast.id, lane: lanes[0] });

  if (cast.kind === "spawn") {
    for (const lane of lanes) {
      for (let i = 0; i < cast.count; i++) {
        const m = cast.minion;
        const unit = createMinion({
          cardId: m.cardId, lane, position: 100 - i * 4, battleTime: state.battleTime,
          role: m.role, hp: m.hp, damage: m.damage, attackSpeed: m.attackSpeed,
          moveSpeed: m.moveSpeed, attackRange: m.attackRange,
        });
        state.units.push(unit);
      }
    }
    log(cast.name);
  } else {
    // hazard
    const coverage = cast.coverage ?? 1;
    const span = 86 * coverage;
    for (const lane of lanes) {
      const hz: ArenaHazard = {
        id: hazardId(),
        owner: "enemy",
        lane,
        startPosition: 2,
        endPosition: Math.min(98, 2 + span),
        warning: cast.warningMs,
        active: cast.activeMs,
        warningTotal: cast.warningMs,
        activeTotal: cast.activeMs,
        damagePerTick: cast.damagePerTick,
        tickInterval: cast.tickMs,
        tickAccumulator: 0,
        effect: cast.effect,
        theme: cast.theme,
        applyStatus: cast.applyStatus,
      };
      // Hazard begins already telegraphed (windup consumed during intent), so
      // give it a short residual warning for the on-board pulse.
      hz.warning = Math.min(cast.warningMs, 450);
      hz.warningTotal = hz.warning;
      state.hazards.push(hz);
    }
    log(cast.name);
  }
}

/** Advance phase if the core dropped past a threshold. */
function updatePhase(state: ArenaBattleState, def: ArenaBossDef, onPhase: (p: BossPhase) => void) {
  const frac = state.boss.coreHp / state.boss.coreMaxHp;
  let phase = 0 as BossPhase;
  for (const th of def.phaseThresholds) if (frac <= th) phase = (phase + 1) as BossPhase;
  if (phase > state.boss.phase) {
    state.boss.phase = phase;
    onPhase(phase);
  }
}

export interface BossTickHelpers {
  log: (text: string, kind: "boss" | "system") => void;
  flash: (palette: string) => void;
  shake: (amount: number) => void;
}

/** Run the boss brain for one tick. */
export function runBossAI(
  state: ArenaBattleState,
  dt: number,
  rng: Rng,
  h: BossTickHelpers,
) {
  const def = getArenaBoss(state.boss.bossId);
  if (!def) return;

  updatePhase(state, def, (p) => {
    h.log(`${state.boss.name} enters phase ${p + 1}!`, "boss");
    h.flash("red");
    h.shake(0.5);
    state.actionLog.push({ t: state.battleTime, type: "phase", detail: String(p) });
  });

  // Phase shrinks the cast interval (more pressure as the boss weakens).
  const phaseMul = 1 - state.boss.phase * 0.15;

  if (state.boss.castTimer > 0) {
    state.boss.castTimer -= dt;
    if (state.boss.windup > 0) state.boss.windup = Math.max(0, state.boss.windup - dt);
    if (state.boss.castTimer <= 0) {
      resolveCast(state, def, rng, (name) => h.log(`${state.boss.name}: ${name}`, "boss"));
      // Schedule the gap until the next telegraph.
      const gap = def.baseCastInterval * phaseMul;
      state.boss.castTimer = gap;
      state.boss.windup = 0;
      state.boss.windupTotal = 0;
      state.boss.intent = "…";
      (state.boss as unknown as { _pendingCastId?: string })._pendingCastId = undefined;
    }
  } else {
    // Idle gap elapsed → telegraph the next cast.
    scheduleCast(state, def, rng);
  }
}

/** Damage the boss core, consuming core shield first. Returns hp removed. */
export function damageBossCore(state: ArenaBattleState, amount: number): number {
  const bs = state.boss as unknown as { coreShield?: number };
  let dmg = amount;
  if (bs.coreShield && bs.coreShield > 0) {
    const absorbed = Math.min(bs.coreShield, dmg);
    bs.coreShield -= absorbed;
    dmg -= absorbed;
  }
  const before = state.boss.coreHp;
  state.boss.coreHp = Math.max(0, state.boss.coreHp - dmg);
  return before - state.boss.coreHp;
}

export function bossCoreShield(state: ArenaBattleState): number {
  return (state.boss as unknown as { coreShield?: number }).coreShield ?? 0;
}
