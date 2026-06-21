// MemeArena — Core type definitions
// Single source of truth for game, economy, and onchain types.

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

export type CardRole =
  | "Damage"
  | "Heavy Damage"
  | "Crit"
  | "Tank"
  | "Support"
  | "Control"
  | "Combo"
  | "Spam"
  | "Economy"
  | "Speed"
  | "Chaos"
  | "AoE"
  | "Sacrifice"
  | "Finisher";

export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";

export type CardTag =
  | "italian-brainrot"
  | "cat"
  | "frog"
  | "chad"
  | "wojak"
  | "damage"
  | "shield"
  | "heal";

/** One upgrade tier description for a card (levels 1-5). */
export interface CardLevelDef {
  level: number;
  /** Short human-readable description of what this level changes. */
  description: string;
}

/**
 * A playable meme card. `effect` is described by a structured `base_effect`
 * jsonb-like object that the card-effect engine interprets at runtime.
 */
export interface Card {
  id: string;
  name: string;
  slug: string;
  role: CardRole;
  rarity: Rarity;
  base_cost: number;
  base_effect: CardEffectDef;
  image_path: string;
  is_active: boolean;
  tags: CardTag[];
  /** Flavor blurb shown in deck builder / battle. */
  flavor: string;
  /** Per-level descriptions (levels 1-5). */
  levels: CardLevelDef[];
}

/**
 * Declarative effect definition. The battle engine reads these primitives.
 * Keeping this data-driven makes cards easy to rebalance in /data/cards.ts.
 */
export interface CardEffectDef {
  /** Direct damage to the boss. */
  damage?: number;
  /** Number of separate damage instances (for multi-hit cards like Popcat). */
  hits?: number;
  /** Shield gained by the player. */
  shield?: number;
  /** Healing applied to the player. */
  heal?: number;
  /** Self-damage cost (Wojak). */
  selfDamage?: number;
  /** Crit chance 0-1. */
  critChance?: number;
  /** Stun chance 0-1. */
  stunChance?: number;
  /** Bonus energy granted next turn. */
  energyNextTurn?: number;
  /** Cards drawn when played. */
  draw?: number;
  /** Dodge stacks granted. */
  dodge?: number;
  /** Reduce cost of next card by this much. */
  nextCardDiscount?: number;
  /** Status effects to apply to the boss. */
  applyStatus?: StatusEffectType[];
  /** Burn stacks to apply. */
  burn?: number;
  /** Grants the player "Hype" buff (next damage card boosted). */
  hype?: boolean;
  /** Bonus damage if played after another damage card (Dogwifhat). */
  comboDamage?: number;
  /** Execute bonus when boss below `executeThreshold` HP fraction. */
  executeThreshold?: number;
  executeBonus?: number;
  /** Random chaos effect (Tralalero Tralala). */
  chaos?: boolean;
}

/* ------------------------------------------------------------------ */
/* Owned cards & decks                                                 */
/* ------------------------------------------------------------------ */

export interface OwnedCard {
  id: string;
  profile_id: string;
  card_id: string;
  level: number;
  shards: number;
  cosmetic_frame_id: string | null;
  unlocked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ActiveDeck {
  id: string;
  profile_id: string;
  name: string;
  card_ids: string[];
  is_selected: boolean;
  updated_at?: string;
}

/* ------------------------------------------------------------------ */
/* Status effects                                                      */
/* ------------------------------------------------------------------ */

export type StatusEffectType =
  | "Burn"
  | "Stun"
  | "Confused"
  | "Rugged"
  | "Chill"
  | "Hype"
  | "Dodge"
  | "ShieldWall";

export interface StatusEffect {
  type: StatusEffectType;
  /** Remaining turns; -1 means until consumed. */
  duration: number;
  /** Magnitude (e.g. Burn stacks). */
  amount: number;
}

/* ------------------------------------------------------------------ */
/* Bosses & AI                                                         */
/* ------------------------------------------------------------------ */

export type BossDifficulty =
  | number
  | "challenge"
  | "daily boss"
  | "limited event";

export interface BossAIMove {
  id: string;
  name: string;
  /** Base damage dealt to player. */
  damage?: number;
  /** Shield the boss gains. */
  shield?: number;
  /** Healing the boss applies to itself. */
  heal?: number;
  /** Status applied to the player. */
  applyStatus?: StatusEffectType[];
  /** Weight used by the weighted-random AI selector. */
  weight: number;
  /** Scales damage with player's missing HP fraction (Jeet Dragon). */
  scalesWithMissingHp?: boolean;
  /** Special telegraphed "big" attack. */
  isBigAttack?: boolean;
  /** Description shown in the intent banner. */
  intentText: string;
}

export interface BossAIPattern {
  moves: BossAIMove[];
  /** Optional scripted opening sequence (move ids). */
  opening?: string[];
}

export interface BossRewardsConfig {
  memearenaMin: number;
  memearenaMax: number;
  coins: [number, number];
  xp: number;
  shards: [number, number];
  /** Probability 0-1 of dropping an Arena Ticket on win. */
  ticketChance: number;
  tier: "low" | "medium" | "high" | "event" | "daily" | "special";
}

export interface Boss {
  id: string;
  name: string;
  slug: string;
  difficulty: BossDifficulty;
  max_hp: number;
  mode_availability: GameModeId[];
  unlock_requirement: UnlockRequirement;
  ai_pattern: BossAIPattern;
  rewards_config: BossRewardsConfig;
  image_path: string;
  is_active: boolean;
  flavor: string;
}

export interface UnlockRequirement {
  playerLevel?: number;
  defeatBossId?: string;
  deckPower?: number;
  always?: boolean;
}

/* ------------------------------------------------------------------ */
/* Combos                                                              */
/* ------------------------------------------------------------------ */

export interface ComboDefinition {
  id: string;
  name: string;
  /** Card ids that must be played in the same battle (any order). */
  cards?: string[];
  /** Repeat condition: play a single card N times. */
  repeatCardId?: string;
  repeatCount?: number;
  effect: ComboEffect;
  banner: string;
  description: string;
}

export interface ComboEffect {
  bonusDamage?: number;
  heal?: number;
  shield?: number;
  draw?: number;
  cleanse?: number;
  guaranteedCrit?: boolean;
  guaranteedStun?: boolean;
  applyStatus?: StatusEffectType[];
  hype?: boolean;
  nextAttackBonus?: number;
  dodge?: number;
}

/* ------------------------------------------------------------------ */
/* Battle state                                                        */
/* ------------------------------------------------------------------ */

export interface BattleCard {
  /** Instance id (unique per copy in deck). */
  uid: string;
  cardId: string;
  level: number;
  /** Effective cost after discounts. */
  cost: number;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  shield: number;
  statuses: StatusEffect[];
  deck: BattleCard[];
  hand: BattleCard[];
  discard: BattleCard[];
  /** Discount applied to the next card played. */
  nextCardDiscount: number;
  /** Bonus energy queued for next turn. */
  pendingEnergy: number;
  /** "Hype" buff — next damage card hits harder. */
  hype: boolean;
  /** Flat bonus added to the next attack (from combos like Hat Mog). */
  nextAttackBonus: number;
  /** Next damage card is a guaranteed crit (Sigma Formation). */
  guaranteedCrit: boolean;
  /** Next stun roll is guaranteed (3 AM Sahur). */
  guaranteedStun: boolean;
  /** Number of cards played this turn (for "after N cards" effects). */
  cardsPlayedThisTurn: number;
}

export interface EnemyState {
  bossId: string;
  name: string;
  hp: number;
  maxHp: number;
  shield: number;
  statuses: StatusEffect[];
  /** The move the boss will perform next turn. */
  intent: BossAIMove | null;
  turnCount: number;
}

export type BattleResultType = "win" | "loss" | "ongoing";

export interface BattleState {
  battleId: string;
  mode: GameModeId;
  bossId: string;
  seed: string;
  turn: number;
  player: PlayerState;
  enemy: EnemyState;
  result: BattleResultType;
  /** Combos triggered this battle. */
  combosTriggered: string[];
  /** Count of each card played (for repeat combos). */
  cardPlayCounts: Record<string, number>;
  /** Sequential action log for anti-cheat replay. */
  actionLog: BattleAction[];
  damageDealt: number;
  /** Survival mode wave. */
  wave?: number;
  log: BattleLogEntry[];
}

export interface BattleAction {
  type: "play_card" | "end_turn" | "boss_move" | "start";
  turn: number;
  cardUid?: string;
  cardId?: string;
  moveId?: string;
  timestamp: number;
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  text: string;
  kind: "player" | "enemy" | "combo" | "system" | "reward";
}

/* ------------------------------------------------------------------ */
/* Game modes                                                          */
/* ------------------------------------------------------------------ */

export type GameModeId =
  | "boss_rush"
  | "daily_boss"
  | "survival"
  | "limited_event"
  | "high_roller";

export interface GameMode {
  id: GameModeId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  /** Free entries available per day (Infinity for always-free). */
  freeEntriesPerDay: number;
  entryCost: {
    tickets?: number;
    gems?: number;
  } | null;
  unlockLevel: number;
  rewardSummary: string;
  accent: string;
  /** Whether token rewards require a connected wallet. */
  requiresWalletForTokens: boolean;
}

/* ------------------------------------------------------------------ */
/* Rewards & economy                                                   */
/* ------------------------------------------------------------------ */

export interface Reward {
  coins: number;
  xp: number;
  shards: number;
  tickets: number;
  /** Pending (unvalidated) MEMEARENA token reward. */
  memearena: number;
  gems?: number;
}

export type RewardLedgerStatus =
  | "pending"
  | "approved"
  | "claimed"
  | "review"
  | "rejected";

export interface RewardLedgerEntry {
  id: string;
  profile_id: string;
  battle_id: string | null;
  reward_type: string;
  currency: string;
  amount: number;
  status: RewardLedgerStatus;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
  approved_at: string | null;
  claimed_at: string | null;
}

export type TokenClaimStatus = "pending" | "processing" | "completed" | "failed";

export interface TokenClaim {
  id: string;
  profile_id: string;
  wallet_address: string;
  amount: number;
  status: TokenClaimStatus;
  transaction_signature: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Purchase {
  id: string;
  profile_id: string;
  wallet_address: string;
  package_id: string;
  memearena_amount: number;
  gems_amount: number;
  transaction_signature: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Reward formula inputs                                               */
/* ------------------------------------------------------------------ */

export interface RewardFormulaInputs {
  baseReward: number;
  difficultyMultiplier: number;
  scoreMultiplier: number;
  comboBonus: number;
  remainingHpBonus: number;
  turnEfficiencyBonus: number;
  entryTypeModifier: number;
  antiFarmModifier: number;
  dailyCapRemaining: number;
  weeklyCapRemaining: number;
  modeDailyCapRemaining: number;
}

export interface EconomyConfig {
  token: {
    name: string;
    symbol: string;
    totalSupply: number;
    allocations: Record<string, number>;
  };
  caps: {
    globalDaily: number;
    globalWeekly: number;
    walletDaily: number;
    walletWeekly: number;
    modeDaily: Record<GameModeId, number>;
  };
  diminishing: {
    /** After this many easy wins/day, rewards start decaying. */
    easyWinThreshold: number;
    /** Multiplier applied per win beyond threshold. */
    decayPerWin: number;
    minMultiplier: number;
  };
  cooldownSeconds: number;
}

/* ------------------------------------------------------------------ */
/* Profiles & currencies                                               */
/* ------------------------------------------------------------------ */

export interface Profile {
  id: string;
  wallet_address: string | null;
  username: string;
  avatar_url: string | null;
  player_level: number;
  xp: number;
  coins: number;
  gems: number;
  arena_tickets: number;
  created_at?: string;
  updated_at?: string;
}

export interface CurrencyBalance {
  coins: number;
  gems: number;
  shards: number;
  arena_tickets: number;
  xp: number;
  pendingMemearena: number;
  approvedMemearena: number;
  claimedMemearena: number;
}

/* ------------------------------------------------------------------ */
/* Upgrades                                                            */
/* ------------------------------------------------------------------ */

export interface UpgradeCost {
  level: number;
  coins: number;
  shards: number;
  gems: number;
}

/* ------------------------------------------------------------------ */
/* Leaderboards                                                        */
/* ------------------------------------------------------------------ */

export type LeaderboardPeriod = "daily" | "weekly" | "all_time";

export interface LeaderboardEntry {
  id: string;
  profile_id: string;
  username: string;
  wallet_address: string | null;
  mode: GameModeId;
  period: LeaderboardPeriod;
  score: number;
  rank: number | null;
  metadata: Record<string, unknown>;
  created_at?: string;
}

/* ------------------------------------------------------------------ */
/* Cosmetics                                                           */
/* ------------------------------------------------------------------ */

export interface CosmeticFrame {
  id: string;
  name: string;
  rarity: Rarity;
  cost_gems: number;
  style_config: {
    gradient: string;
    glow: string;
    border: string;
  };
  unlock_requirement: UnlockRequirement | null;
}

export interface PlayerCosmetic {
  id: string;
  profile_id: string;
  cosmetic_frame_id: string;
  unlocked_at: string;
}

/* ------------------------------------------------------------------ */
/* Mode entries                                                        */
/* ------------------------------------------------------------------ */

export interface ModeEntry {
  id: string;
  profile_id: string;
  mode: GameModeId;
  entry_type: "free" | "ticket" | "gems";
  cost_currency: string | null;
  cost_amount: number;
  status: "granted" | "rejected";
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Shop                                                                */
/* ------------------------------------------------------------------ */

export interface GemPackage {
  id: string;
  gems: number;
  memearenaCost: number;
  bonusLabel?: string;
  popular?: boolean;
}
