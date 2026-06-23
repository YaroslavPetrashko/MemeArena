// MemeArena — Arena (3-lane real-time PvE) type definitions.
// These power the new arena battle engine in /lib/game/arena*.
// Kept separate from the legacy turn-based types in ./index.ts.

import type { GameModeId, Rarity } from "./index";

/* ------------------------------------------------------------------ */
/* Card arena profiles & stats                                         */
/* ------------------------------------------------------------------ */

/** FIFA-style six-stat block, each 1–100. */
export interface CardStats {
  power: number;
  health: number;
  speed: number;
  range: number;
  control: number;
  utility: number;
}

export type StatKey = keyof CardStats;

export type ArenaUnitType =
  | "Support Unit"
  | "Melee Fighter"
  | "Assassin"
  | "Ranged Swarm"
  | "Runner / Utility"
  | "Tank Bruiser"
  | "Control Tank"
  | "Heavy Bruiser"
  | "Dash Tempo Unit"
  | "Chaos Caster"
  | "Spell / Airstrike"
  | "Decoy / Sacrifice"
  | "Shield Support"
  | "Execute Assassin";

/** Broad behavior role used by the engine to pick movement/targeting AI. */
export type ArenaRole =
  | "melee"
  | "ranged"
  | "assassin"
  | "tank"
  | "support"
  | "runner"
  | "spell"
  | "decoy";

export type CardType = "unit" | "spell" | "support" | "runner" | "decoy";

export type TargetType = "ground" | "air" | "boss" | "lane" | "all";

export interface CardArenaProfile {
  cardId: string;
  /** Level-1 baseline six stats (1–100). Source of OVR + engine derivation. */
  stats: CardStats;
  unitType: ArenaUnitType;
  role: ArenaRole;
  cardType: CardType;
  targetType: TargetType;
  deployCost: number;
  /** Ability text shown in the profile modal. */
  basicAttack: string;
  specialAbility: string;
  passiveAbility: string;
  ultimateAbility: string;
  synergyTags: string[];
  /** Short personality/lore line. */
  lore: string;
}

/** A profile resolved to a specific level (stats scaled, OVR computed). */
export interface ResolvedArenaProfile extends CardArenaProfile {
  level: number;
  rarity: Rarity;
  ovr: number;
}

/* ------------------------------------------------------------------ */
/* Live arena battle state                                             */
/* ------------------------------------------------------------------ */

export type ArenaOwner = "player" | "enemy";
export type Lane = 0 | 1 | 2;

export type ArenaStatusType =
  | "stun"
  | "slow"
  | "burn"
  | "confuse"
  | "shielded"
  | "taunt"
  | "haste"
  | "dodge"
  | "unstoppable"
  | "crit_buff";

export interface ArenaStatus {
  type: ArenaStatusType;
  /** Remaining time in ms. */
  remaining: number;
  /** Magnitude (e.g. slow %, burn dmg/tick, shield amount). */
  amount: number;
}

/** Transient visual cue the renderer should play once. */
export type UnitVisualEvent =
  | "spawn"
  | "attack"
  | "hit"
  | "ability"
  | "death"
  | "dash"
  | "shielded";

export interface ArenaUnit {
  id: string;
  cardId: string;
  owner: ArenaOwner;
  lane: Lane;
  /** 0 = player base, 100 = boss base. */
  position: number;
  hp: number;
  maxHp: number;
  shield: number;
  damage: number;
  /** Attacks per second. */
  attackSpeed: number;
  /** Range in board units (0–100). */
  attackRange: number;
  /** Board units per second. */
  moveSpeed: number;
  role: ArenaRole;
  targetType: TargetType;
  cardType: CardType;
  level: number;
  rarity: Rarity;
  statuses: ArenaStatus[];
  /** Cooldowns in ms, keyed by ability id. */
  cooldowns: Record<string, number>;
  /** Per-card scratch state (combo counters, dash flags, etc.). */
  abilityState: Record<string, number>;
  /** ms until next basic attack is ready. */
  attackCooldown: number;
  /** One-shot visual events the renderer consumes then clears. */
  visualEvents: UnitVisualEvent[];
  /** Last facing/move delta sign for trail direction. */
  moving: boolean;
  /** Birth timestamp (battleTime ms) for idle-bob phase variety. */
  bornAt: number;
}

export type ProjectileEffect =
  | "pop"
  | "bolt"
  | "note"
  | "dagger"
  | "acorn"
  | "claw";

export interface ArenaProjectile {
  id: string;
  sourceUnitId: string;
  owner: ArenaOwner;
  lane: Lane;
  fromPosition: number;
  toPosition: number;
  currentPosition: number;
  damage: number;
  /** Board units per second. */
  speed: number;
  effectType: ProjectileEffect;
  /** Target unit id (despawn early if it dies). */
  targetId: string | null;
}

export type HazardEffect =
  | "explosion"
  | "burn"
  | "stun"
  | "drain"
  | "fire"
  | "splash"
  | "slow"
  | "lock";

export type HazardTheme =
  | "fire"
  | "energy"
  | "rug"
  | "digital"
  | "water"
  | "chart"
  | "vampire"
  | "stomp"
  | "stun"
  | "chaos"
  | "gold";

export interface ArenaHazard {
  id: string;
  owner: ArenaOwner;
  lane: Lane;
  startPosition: number;
  endPosition: number;
  /** ms remaining of the telegraph/warning phase. */
  warning: number;
  /** ms remaining of the active (damaging) phase. */
  active: number;
  warningTotal: number;
  activeTotal: number;
  damagePerTick: number;
  /** ms between damage ticks. */
  tickInterval: number;
  tickAccumulator: number;
  effect: HazardEffect;
  theme: HazardTheme;
  /** Status applied to units caught in the zone. */
  applyStatus?: ArenaStatusType;
}

export interface ActiveCombo {
  id: string;
  name: string;
  /** ms remaining of the cinematic banner. */
  bannerRemaining: number;
  /** ms remaining of the gameplay effect. */
  effectRemaining: number;
  palette: string;
  cardIds: string[];
}

export type ArenaFloatKind =
  | "damage"
  | "crit"
  | "heal"
  | "shield"
  | "energy"
  | "stun"
  | "miss";

/** Floating combat number/marker for the renderer. */
export interface ArenaFloat {
  id: string;
  lane: Lane;
  position: number;
  owner: ArenaOwner;
  kind: ArenaFloatKind;
  value?: number;
  label?: string;
  /** ms remaining. */
  ttl: number;
}

/** Ephemeral spell/impact decal on the floor. */
export interface ArenaDecal {
  id: string;
  lane: Lane;
  position: number;
  theme: HazardTheme | "death" | "ability";
  ttl: number;
  ttlTotal: number;
}

export interface ArenaHandCard {
  uid: string;
  cardId: string;
  level: number;
  cost: number;
  /** ms until this card can be redeployed (0 = ready). */
  deployCooldown: number;
}

export type BossPhase = 0 | 1 | 2 | 3;

export interface ArenaBossState {
  bossId: string;
  name: string;
  coreHp: number;
  coreMaxHp: number;
  phase: BossPhase;
  /** ms until the next ability cast. */
  castTimer: number;
  /** Human-readable upcoming intent. */
  intent: string;
  /** ms remaining of the current cast's wind-up (for the intent bar). */
  windup: number;
  windupTotal: number;
}

export type ArenaStatus_ =
  | "intro"
  | "playing"
  | "won"
  | "lost";

export interface ArenaEventLogEntry {
  id: string;
  t: number;
  text: string;
  kind: "player" | "enemy" | "combo" | "system" | "boss";
}

/** Deterministic action record for server replay/anti-cheat. */
export interface ArenaAction {
  t: number;
  type: "deploy" | "cast" | "combo" | "boss_cast" | "phase" | "start" | "end";
  cardId?: string;
  lane?: Lane;
  position?: number;
  detail?: string;
}

export interface ArenaBattleState {
  battleId: string;
  mode: GameModeId;
  seed: string;
  status: ArenaStatus_;

  boss: ArenaBossState;
  playerBaseHp: number;
  playerBaseMaxHp: number;

  energy: number;
  maxEnergy: number;
  energyAccumulator: number;
  energyRegenPerSec: number;

  hand: ArenaHandCard[];
  deckCycle: ArenaHandCard[];

  units: ArenaUnit[];
  projectiles: ArenaProjectile[];
  hazards: ArenaHazard[];
  floats: ArenaFloat[];
  decals: ArenaDecal[];
  activeCombos: ActiveCombo[];

  /** 0–100 hype/ultimate meter. */
  hype: number;
  hypeReady: boolean;

  /** Elapsed battle time in ms. */
  battleTime: number;
  /** Mode time limit in ms (0 = no hard limit). */
  timeLimit: number;

  /** Survival wave counter. */
  wave: number;
  /** ms until next survival wave spawns. */
  waveTimer: number;
  /** True while a survival wave-reward choice is pending (engine paused). */
  awaitingWaveChoice: boolean;

  /** Stats for scoring/rewards. */
  totalBossDamage: number;
  unitsDeployed: number;
  unitsLost: number;
  combosTriggered: string[];
  energySpent: number;

  eventLog: ArenaEventLogEntry[];
  actionLog: ArenaAction[];

  /** Recent combo-deploy timestamps for window detection. */
  recentDeploys: { cardId: string; t: number }[];
  /** Screen-shake intensity 0–1, decays each tick. */
  shake: number;
  /** Brief board flash palette for combos/phase changes (or null). */
  flash: string | null;
  flashTtl: number;
  /** Combo flags consumed by ability resolution. */
  comboFlags: Record<string, number>;
}
