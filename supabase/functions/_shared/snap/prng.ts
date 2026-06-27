// MIRROR of the SNAP engine — keep in sync with src/lib/game/snap/prng.ts
// Deterministic seeded PRNG for the SNAP match engine.
//
// IMPORTANT: This module is dependency-free and isomorphic. It is mirrored
// verbatim into supabase/functions/_shared/snap/prng.ts for authoritative
// server replay. Do not import anything here, and never use Math.random or
// Date in the engine — all randomness must flow through a seeded Rng so the
// client and server produce byte-identical match outcomes.

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Integer in [min, max] inclusive. */
  range(min: number, max: number): number;
  /** Uniform pick from a non-empty array. */
  pick<T>(arr: T[]): T;
}

/** xmur3-style string hash → 32-bit seed. */
export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** mulberry32 generator. Deterministic for a given seed string. */
export function createRng(seed: string): Rng {
  let a = hashSeed(seed);
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (p) => next() < p,
    range: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

/** Deterministic Fisher–Yates shuffle. Returns a NEW array; input untouched. */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Weighted pick. Falls back to the last item if weights sum to 0. */
export function pickWeighted<T>(
  items: readonly T[],
  weight: (item: T) => number,
  rng: Rng,
): T {
  const weights = items.map((it) => Math.max(0, weight(it)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[items.length - 1];
  let roll = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Deterministic tie-break: hashes a string key with the seed and returns a
 * stable comparator value in [0, 1). Use to break ties without bias.
 */
export function seededTieBreak(seed: string, key: string): number {
  return (hashSeed(seed + "::" + key) >>> 0) / 4294967296;
}
