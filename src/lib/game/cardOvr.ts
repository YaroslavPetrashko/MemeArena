import type { Rarity } from "@/types";
import type {
  CardStats,
  StatKey,
  ArenaRole,
  CardArenaProfile,
  ResolvedArenaProfile,
} from "@/types/arena";
import { getArenaProfile } from "@/data/cardArenaProfiles";
import { getCard } from "@/data/cards";

/**
 * Role-based OVR weights (FIFA-style). Each role emphasizes different stats so
 * a tank's OVR rewards Health/Control while an assassin's rewards Power/Speed.
 * Weights per role sum to 1.
 */
const ROLE_WEIGHTS: Record<ArenaRole, Record<StatKey, number>> = {
  melee: { power: 0.3, health: 0.22, speed: 0.18, range: 0.05, control: 0.1, utility: 0.15 },
  ranged: { power: 0.26, health: 0.1, speed: 0.16, range: 0.26, control: 0.12, utility: 0.1 },
  assassin: { power: 0.34, health: 0.08, speed: 0.3, range: 0.08, control: 0.1, utility: 0.1 },
  tank: { power: 0.12, health: 0.34, speed: 0.06, range: 0.06, control: 0.27, utility: 0.15 },
  support: { power: 0.06, health: 0.16, speed: 0.1, range: 0.14, control: 0.2, utility: 0.34 },
  runner: { power: 0.1, health: 0.1, speed: 0.32, range: 0.06, control: 0.1, utility: 0.32 },
  spell: { power: 0.32, health: 0.04, speed: 0.06, range: 0.3, control: 0.22, utility: 0.06 },
  decoy: { power: 0.06, health: 0.3, speed: 0.08, range: 0.04, control: 0.18, utility: 0.34 },
};

/** Per-level total stat-point budget added on top of baseline (cumulative). */
const LEVEL_STAT_BONUS: Record<number, number> = {
  1: 0,
  2: 10,
  3: 18,
  4: 28,
  5: 40,
};

/**
 * Stat-growth bias per role: which stats a card invests its level-up points in.
 * Values are relative weights (need not sum to 1); normalized at apply time.
 */
const GROWTH_BIAS: Record<ArenaRole, Partial<Record<StatKey, number>>> = {
  melee: { power: 3, health: 2, speed: 1 },
  ranged: { power: 2, range: 2, speed: 1 },
  assassin: { power: 3, speed: 2, control: 1 },
  tank: { health: 3, control: 2, utility: 1 },
  support: { utility: 3, control: 2, health: 1 },
  runner: { speed: 2, utility: 3 },
  spell: { power: 3, range: 2, control: 1 },
  decoy: { health: 3, utility: 2, control: 1 },
};

const ALL_KEYS: StatKey[] = ["power", "health", "speed", "range", "control", "utility"];

function clampStat(v: number): number {
  return Math.max(1, Math.min(100, Math.round(v)));
}

/** Apply level scaling to a profile's baseline stats. */
export function scaleStats(base: CardStats, role: ArenaRole, level: number): CardStats {
  const budget = LEVEL_STAT_BONUS[Math.min(5, Math.max(1, level))] ?? 0;
  if (budget === 0) return { ...base };

  const bias = GROWTH_BIAS[role];
  const totalBias = Object.values(bias).reduce((a, b) => a + (b ?? 0), 0) || 1;

  const out: CardStats = { ...base };
  for (const key of ALL_KEYS) {
    const share = (bias[key] ?? 0) / totalBias;
    out[key] = clampStat(base[key] + budget * share);
  }
  return out;
}

/** Compute OVR (1–100) from stats using the card's role weighting. */
export function computeOvr(stats: CardStats, role: ArenaRole): number {
  const w = ROLE_WEIGHTS[role];
  let sum = 0;
  for (const key of ALL_KEYS) sum += stats[key] * w[key];
  // Slight curve so elite cards crack 90 and average cards land mid-60s.
  return clampStat(sum * 1.02);
}

function rarityOf(cardId: string): Rarity {
  return getCard(cardId)?.rarity ?? "Common";
}

/** Resolve a card's arena profile to a concrete level (scaled stats + OVR). */
export function resolveArenaProfile(
  cardId: string,
  level: number,
): ResolvedArenaProfile | undefined {
  const profile = getArenaProfile(cardId);
  if (!profile) return undefined;
  const stats = scaleStats(profile.stats, profile.role, level);
  return {
    ...profile,
    level,
    rarity: rarityOf(cardId),
    stats,
    ovr: computeOvr(stats, profile.role),
  };
}

/** Base-level OVR (level 1) — handy for collection sorting. */
export function baseOvr(profile: CardArenaProfile): number {
  return computeOvr(profile.stats, profile.role);
}

/** Stat delta between current level and next level (for upgrade previews). */
export function statDelta(
  cardId: string,
  level: number,
): Partial<Record<StatKey, number>> | null {
  const profile = getArenaProfile(cardId);
  if (!profile || level >= 5) return null;
  const cur = scaleStats(profile.stats, profile.role, level);
  const next = scaleStats(profile.stats, profile.role, level + 1);
  const delta: Partial<Record<StatKey, number>> = {};
  for (const key of ALL_KEYS) {
    const d = next[key] - cur[key];
    if (d !== 0) delta[key] = d;
  }
  return delta;
}

export const STAT_LABELS: Record<StatKey, string> = {
  power: "Power",
  health: "Health",
  speed: "Speed",
  range: "Range",
  control: "Control",
  utility: "Utility",
};

export const STAT_ORDER: StatKey[] = ALL_KEYS;
