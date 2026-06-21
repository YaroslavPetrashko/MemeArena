/**
 * Deterministic seeded RNG (mulberry32). A battle seed makes runs reproducible,
 * which is the foundation for the future server-authoritative replay anti-cheat
 * (backend issues seed → client sends action log → backend replays).
 */
export interface Rng {
  next(): number;
  chance(p: number): boolean;
  range(min: number, max: number): number;
  pick<T>(arr: T[]): T;
}

export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createRng(seed: string): Rng {
  let a = hashSeed(seed);
  const next = () => {
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

export function makeSeed(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}
