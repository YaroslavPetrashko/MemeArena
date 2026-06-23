import type { ArenaStatusType } from "@/types/arena";

/**
 * Arena combos become battlefield-wide effects with a cinematic banner.
 * Detection runs each tick in arenaCombos.ts engine logic; these definitions
 * describe trigger conditions + the effect payload.
 */
export type ComboTrigger =
  | { kind: "deployed_within"; cardIds: string[]; windowMs: number }
  | { kind: "both_active"; cardIds: string[] }
  | { kind: "all_active"; cardIds: string[] }
  | { kind: "ability_count"; cardId: string; ability: string; count: number }
  | { kind: "death_while_active"; deadCardId: string; activeCardId: string }
  | { kind: "reached_boss_while_active"; runnerCardId: string; activeCardId: string };

export interface ArenaComboEffect {
  /** Flat bonus damage to all enemies in affected lanes. */
  laneDamage?: number;
  /** Apply this status to enemies in affected lanes. */
  applyEnemyStatus?: { type: ArenaStatusType; durationMs: number; amount?: number };
  /** Buff: attack-speed multiplier to tagged allies for a duration. */
  allyHaste?: { tag: string; durationMs: number };
  /** Crit buff to allies (guaranteed-crit window). */
  allyCrit?: { durationMs: number };
  /** Shield all allies in affected lanes. */
  allyShield?: number;
  /** Heal the player base. */
  baseHeal?: number;
  /** Refund energy. */
  energy?: number;
  /** Spawn a temporary clone of this card for the player. */
  spawnClone?: string;
  /** Affects all three lanes (otherwise just lanes with the trigger cards). */
  allLanes?: boolean;
}

export interface ArenaComboDef {
  id: string;
  name: string;
  trigger: ComboTrigger;
  effect: ArenaComboEffect;
  palette: string; // tailwind-ish accent used for banner/flash
  banner: string;
  description: string;
  /** Cooldown before this combo can fire again (ms). */
  cooldownMs: number;
}

export const ARENA_COMBOS: ArenaComboDef[] = [
  {
    id: "italian_brainrot",
    name: "Italian Brainrot",
    trigger: {
      kind: "deployed_within",
      cardIds: ["ballerina_cappuccino", "bombardino_crocodilo", "tralalero_tralala"],
      windowMs: 10000,
    },
    effect: {
      laneDamage: 40,
      applyEnemyStatus: { type: "confuse", durationMs: 4000 },
      allyHaste: { tag: "italian-brainrot", durationMs: 6000 },
      allLanes: true,
    },
    palette: "magenta",
    banner: "ITALIAN BRAINROT!",
    description: "Chaos spotlight across all lanes — bonus damage, confusion, and +20% attack speed to brainrot units.",
    cooldownMs: 14000,
  },
  {
    id: "sigma_formation",
    name: "Sigma Formation",
    trigger: { kind: "both_active", cardIds: ["gigachad", "sigma_cat"] },
    effect: {
      allyCrit: { durationMs: 5000 },
      allyShield: 60,
    },
    palette: "lime",
    banner: "SIGMA FORMATION",
    description: "GigaChad gains a crit aura while nearby allies are shielded.",
    cooldownMs: 12000,
  },
  {
    id: "three_am_sahur",
    name: "3 AM Sahur",
    trigger: { kind: "ability_count", cardId: "tung_tung_tung_sahur", ability: "drum_stun", count: 3 },
    effect: {
      laneDamage: 30,
      applyEnemyStatus: { type: "stun", durationMs: 2200 },
    },
    palette: "indigo",
    banner: "3 AM SAHUR",
    description: "A lane-wide stun wave plus bonus damage.",
    cooldownMs: 10000,
  },
  {
    id: "were_so_back",
    name: "We're So Back",
    trigger: { kind: "death_while_active", deadCardId: "wojak", activeCardId: "pepe_the_frog" },
    effect: {
      baseHeal: 80,
      allyShield: 50,
    },
    palette: "emerald",
    banner: "WE'RE SO BACK",
    description: "Wojak's sacrifice heals the base and shields the lane.",
    cooldownMs: 9000,
  },
  {
    id: "cat_supremacy",
    name: "Cat Supremacy",
    trigger: { kind: "all_active", cardIds: ["mog_cat", "popcat", "sigma_cat"] },
    effect: {
      spawnClone: "popcat",
      allyCrit: { durationMs: 5000 },
    },
    palette: "purple",
    banner: "CAT SUPREMACY",
    description: "Summon a Popcat clone and grant the cats a crit boost.",
    cooldownMs: 13000,
  },
  {
    id: "hat_mog",
    name: "Hat Mog",
    trigger: { kind: "deployed_within", cardIds: ["dogwifhat", "mog_cat"], windowMs: 8000 },
    effect: {
      allyCrit: { durationMs: 4000 },
    },
    palette: "gold",
    banner: "HAT MOG",
    description: "The next fighter/assassin attacks crit.",
    cooldownMs: 10000,
  },
  {
    id: "tiny_titans",
    name: "Tiny Titans",
    trigger: { kind: "reached_boss_while_active", runnerCardId: "peanut_the_squirrel", activeCardId: "moo_deng_hippo" },
    effect: {
      laneDamage: 35,
      allyShield: 45,
      energy: 2,
    },
    palette: "cyan",
    banner: "TINY TITANS",
    description: "Moo Deng stomps, Peanut drops energy, and the lane is shielded.",
    cooldownMs: 11000,
  },
];

export const ARENA_COMBOS_BY_ID: Record<string, ArenaComboDef> = Object.fromEntries(
  ARENA_COMBOS.map((c) => [c.id, c]),
);
