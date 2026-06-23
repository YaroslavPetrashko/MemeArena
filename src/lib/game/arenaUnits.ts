import type { Rarity } from "@/types";
import type {
  ArenaUnit,
  ArenaOwner,
  Lane,
  CardStats,
  ArenaRole,
} from "@/types/arena";
import { resolveArenaProfile } from "./cardOvr";
import { getArenaProfile } from "@/data/cardArenaProfiles";

/* ------------------------------------------------------------------ */
/* Stat → combat derivation                                            */
/* ------------------------------------------------------------------ */
//
// The six FIFA stats are abstract (1–100). The engine needs concrete combat
// numbers. We map them here with simple, readable curves so designers can keep
// reasoning in stat-space while the simulation stays deterministic.

/** Health stat → hit points. */
function deriveHp(stats: CardStats, rarity: Rarity): number {
  const rarityBonus = { Common: 1, Rare: 1.05, Epic: 1.12, Legendary: 1.2 }[rarity];
  return Math.round((40 + stats.health * 3.2) * rarityBonus);
}

/** Power stat → per-hit damage. */
function deriveDamage(stats: CardStats): number {
  return Math.round(3 + stats.power * 0.32);
}

/** Speed stat → attacks per second (0.55–1.9). */
function deriveAttackSpeed(stats: CardStats): number {
  return +(0.55 + (stats.speed / 100) * 1.35).toFixed(2);
}

/** Speed stat → movement (board units/sec). Tanks crawl, runners fly. */
function deriveMoveSpeed(stats: CardStats, role: ArenaRole): number {
  const base = 6 + (stats.speed / 100) * 18; // 6–24 units/sec
  const roleMul = role === "tank" ? 0.7 : role === "runner" ? 1.25 : 1;
  return +(base * roleMul).toFixed(2);
}

/** Range stat → attack range in board units (melee ~6, ranged up to ~34). */
function deriveRange(stats: CardStats): number {
  return Math.round(5 + (stats.range / 100) * 30);
}

export interface DerivedCombat {
  hp: number;
  damage: number;
  attackSpeed: number;
  moveSpeed: number;
  attackRange: number;
}

export function deriveCombat(
  stats: CardStats,
  role: ArenaRole,
  rarity: Rarity,
): DerivedCombat {
  return {
    hp: deriveHp(stats, rarity),
    damage: deriveDamage(stats),
    attackSpeed: deriveAttackSpeed(stats),
    moveSpeed: deriveMoveSpeed(stats, role),
    attackRange: deriveRange(stats),
  };
}

let unitCounter = 0;
export function nextUnitId(prefix = "u"): string {
  return `${prefix}_${unitCounter++}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export interface SpawnUnitArgs {
  cardId: string;
  level: number;
  owner: ArenaOwner;
  lane: Lane;
  position: number;
  battleTime: number;
  /** Optional combat-stat overrides (used for enemy minions). */
  override?: Partial<DerivedCombat>;
  rarityOverride?: Rarity;
}

/** Build a player ArenaUnit from a card profile. */
export function createArenaUnit(args: SpawnUnitArgs): ArenaUnit {
  const profile = resolveArenaProfile(args.cardId, args.level);
  if (!profile) throw new Error(`No arena profile for ${args.cardId}`);
  const combat = {
    ...deriveCombat(profile.stats, profile.role, profile.rarity),
    ...args.override,
  };
  return {
    id: nextUnitId(args.owner === "player" ? "p" : "e"),
    cardId: args.cardId,
    owner: args.owner,
    lane: args.lane,
    position: args.position,
    hp: combat.hp,
    maxHp: combat.hp,
    shield: 0,
    damage: combat.damage,
    attackSpeed: combat.attackSpeed,
    attackRange: combat.attackRange,
    moveSpeed: combat.moveSpeed,
    role: profile.role,
    targetType: profile.targetType,
    cardType: profile.cardType,
    level: args.level,
    rarity: args.rarityOverride ?? profile.rarity,
    statuses: [],
    cooldowns: {},
    abilityState: {},
    attackCooldown: 0,
    visualEvents: ["spawn"],
    moving: true,
    bornAt: args.battleTime,
  };
}

/** Build a generic enemy minion (boss-spawned) with explicit combat stats. */
export function createMinion(args: {
  cardId: string;
  lane: Lane;
  position: number;
  battleTime: number;
  role: ArenaRole;
  hp: number;
  damage: number;
  attackSpeed: number;
  moveSpeed: number;
  attackRange: number;
  rarity?: Rarity;
}): ArenaUnit {
  return {
    id: nextUnitId("e"),
    cardId: args.cardId,
    owner: "enemy",
    lane: args.lane,
    position: args.position,
    hp: args.hp,
    maxHp: args.hp,
    shield: 0,
    damage: args.damage,
    attackSpeed: args.attackSpeed,
    attackRange: args.attackRange,
    moveSpeed: args.moveSpeed,
    role: args.role,
    targetType: "ground",
    cardType: "unit",
    level: 1,
    rarity: args.rarity ?? "Common",
    statuses: [],
    cooldowns: {},
    abilityState: {},
    attackCooldown: 0,
    visualEvents: ["spawn"],
    moving: true,
    bornAt: args.battleTime,
  };
}

export { getArenaProfile };
