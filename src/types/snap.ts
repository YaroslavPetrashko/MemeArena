// MemeArena — SNAP-style PvE card game types.
//
// These types describe the new primary gameplay: a 6-turn, 3-location,
// simultaneous-reveal card game. They are intentionally independent from the
// legacy combat types in `./index.ts` (which are being removed) so the
// deterministic engine can stay dependency-free and mirror cleanly into the
// Supabase Edge Function replay (Deno cannot import the `@/` alias).


/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

/** How a card's ability behaves in the resolution pipeline. */
export type AbilityType =
  | "on_reveal"
  | "ongoing"
  | "end_game"
  | "conditional"
  | "none";

export type SnapCardTag =
  | "Support"
  | "Meme"
  | "On Reveal"
  | "Animal"
  | "Hype"
  | "Conditional"
  | "Cat"
  | "Scaling"
  | "Token"
  | "Ramp"
  | "Tank"
  | "Ongoing"
  | "Control"
  | "Finisher"
  | "Move"
  | "Brainrot"
  | "Chaos"
  | "AoE"
  | "Buff"
  | "Execute"
  | "Destroy"
  | "Pepe"
  | "Simple"
  | "Draw"
  | "Whale"
  | "Disrupt"
  | "Manipulation"
  | "End Game"
  | "Bot"
  | "Drain"
  | "Tempo"
  | "Defense"
  | "Early"
  | "Debuff";

/** Per-level upgrade tweak. Applied additively on top of the base card. */
export interface SnapLevelDef {
  level: number;
  /** Flat power added to base power at this level. */
  powerBonus?: number;
  /** Flat cost reduction at this level (floored at 0). */
  costReduction?: number;
  /** Bumps a numeric ability magnitude (interpreted per-ability). */
  abilityBonus?: number;
  /** Human-readable summary for the card modal upgrade preview. */
  description: string;
}

/**
 * Static, content-authored card definition (lives in /data/snapCards.ts).
 * A card has ONLY cost, power, and one simple ability sentence.
 */
export interface SnapCardDef {
  id: string;
  name: string;
  slug: string;
  cost: number;
  power: number;
  abilityText: string;
  abilityType: AbilityType;
  /** Registry key into the ability handler table (null for "none"). */
  abilityId: string | null;
  tags: SnapCardTag[];
  imagePath: string;
  /** Levels 1-5; index 0 is the level-1 baseline. */
  levels: SnapLevelDef[];
  /** Flavor blurb for the detail modal. */
  flavor: string;
  /** True for engine-spawned tokens (Pop Token, Bot, Meme Token). */
  isToken?: boolean;
}

/** A live card instance on the board / in a hand during a match. */
export interface SnapCard {
  instanceId: string;
  cardId: string;
  owner: "player" | "boss";
  name: string;
  cost: number;
  /** Base power (after level upgrades) before in-match modifiers. */
  basePower: number;
  /** Effective power after all modifiers/ongoing effects this recompute. */
  currentPower: number;
  abilityText: string;
  abilityType: AbilityType;
  abilityId: string | null;
  tags: SnapCardTag[];
  level: number;
  imagePath: string;
  /** Ability magnitude bonus from upgrades (see SnapLevelDef.abilityBonus). */
  abilityBonus: number;
  /** Where the card sits; null while in hand. */
  locationId: string | null;
  /** Face-up to the opponent? Staged cards are hidden until reveal. */
  isRevealed: boolean;
  /** Flat power modifiers from abilities/locations (id -> amount). */
  modifiers: SnapModifier[];
  isToken: boolean;
}

export interface SnapModifier {
  /** Source descriptor, e.g. "loc:pump_plaza" or "card:sigma_cat". */
  source: string;
  /** Flat power delta. */
  amount: number;
  /** "ongoing" recomputed each pass; "permanent" baked in once. */
  kind: "ongoing" | "permanent";
}

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */

export interface SnapLocationTheme {
  gradient: string;
  icon: string;
  color: string;
  /** Optional location art shown behind the slots (Marvel-Snap style). */
  imagePath?: string;
}

export interface SnapLocationDef {
  id: string;
  name: string;
  effectText: string;
  effectId: string | null;
  /** Default max slots per side (Whale Wall overrides to 1 via effect). */
  maxSlotsPerSide: number;
  theme: SnapLocationTheme;
  flavor: string;
}

export interface SnapLocation {
  id: string;
  defId: string;
  name: string;
  effectText: string;
  effectId: string | null;
  /** Which turn (1-3) this location flips face-up. */
  revealTurn: number;
  isRevealed: boolean;
  maxSlotsPerSide: number;
  theme: SnapLocationTheme;
  playerCards: SnapCard[];
  bossCards: SnapCard[];
  /** Recomputed totals (sum of currentPower per side). */
  playerPower: number;
  bossPower: number;
}

/* ------------------------------------------------------------------ */
/* Bosses                                                              */
/* ------------------------------------------------------------------ */

export type BossPersonality =
  | "aggressive"
  | "disruptive"
  | "greedy"
  | "wide"
  | "stacker"
  | "chaotic";

export type BossRewardTier =
  | "low"
  | "medium"
  | "high"
  | "challenge"
  | "daily"
  | "event";

export interface SnapBoss {
  id: string;
  name: string;
  slug: string;
  difficulty: number | "challenge" | "daily" | "event";
  personality: BossPersonality;
  /** Card ids the boss draws/selects from. */
  deck: string[];
  /** Registry key for the boss passive (null = none). */
  passiveId: string | null;
  passiveText: string;
  /** Location def ids the boss favors (AI weight nudge). */
  preferredLocations: string[];
  signatureCardId: string;
  rewardTier: BossRewardTier;
  imagePath: string;
  flavor: string;
  /** Unlock gate (sequential boss rush). */
  unlockAfterBossId: string | null;
}

/* ------------------------------------------------------------------ */
/* Match state                                                         */
/* ------------------------------------------------------------------ */

export type SnapModeId =
  | "boss_rush"
  | "daily_boss"
  | "survival"
  | "limited_event"
  | "high_roller";

export type SnapMatchStatus =
  | "staging" // player is placing cards this turn
  | "revealing" // reveal animation playing
  | "complete"; // match finished

export type SnapResult = "win" | "loss" | "draw";

export interface PlayerSnapState {
  profileId: string;
  /** Card ids remaining in deck (draw order set by seed at create). */
  deck: SnapCard[];
  hand: SnapCard[];
  /** Cards staged this turn but not yet revealed (instanceIds). */
  energy: number;
  hasEndedTurn: boolean;
  /** Bonus energy queued for next turn (Peanut). */
  pendingEnergy: number;
  /** "buff next played card" pending amount (Wojak). */
  nextCardBonus: number;
}

export interface BossSnapState {
  bossId: string;
  deck: SnapCard[];
  hand: SnapCard[];
  personality: BossPersonality;
  energy: number;
  pendingEnergy: number;
}

/** A staged (not yet revealed) play, used during a turn and in the action log. */
export interface SnapStagedPlay {
  instanceId: string;
  cardId: string;
  locationId: string;
  owner: "player" | "boss";
  /** Order placed within the turn (reveal tiebreak within a side). */
  orderIndex: number;
}

export interface SnapAction {
  turn: number;
  cardInstanceId: string;
  cardId: string;
  locationId: string;
  orderIndex: number;
}

export type SnapEventType =
  | "turn_start"
  | "location_reveal"
  | "card_reveal"
  | "ability"
  | "location_effect"
  | "power_change"
  | "scoring"
  | "result";

export interface SnapEventLogEntry {
  id: string;
  turn: number;
  type: SnapEventType;
  message: string;
  payload?: Record<string, unknown>;
}

export interface SnapLocationScore {
  locationId: string;
  playerPower: number;
  bossPower: number;
  winner: "player" | "boss" | "tie";
}

export interface SnapScore {
  result: SnapResult;
  locationsWon: number;
  locationsLost: number;
  locationsTied: number;
  playerTotalPower: number;
  bossTotalPower: number;
  powerDifferential: number;
  /** Power swing created on the final turn (turn 6). */
  finalTurnSwing: number;
  difficultyMultiplier: number;
  /** Survival streak / event multipliers (1 if not applicable). */
  streakMultiplier: number;
  eventMultiplier: number;
  /** Final composite score (feeds reward + leaderboard). */
  total: number;
  locations: SnapLocationScore[];
}

export interface SnapMatchState {
  matchId: string;
  mode: SnapModeId;
  bossId: string;
  turn: number;
  maxTurns: number;
  /** Energy for the player THIS turn (== turn number by default). */
  energy: number;
  player: PlayerSnapState;
  boss: BossSnapState;
  locations: SnapLocation[];
  /** Player's staged plays for the current (not yet revealed) turn. */
  stagedPlays: SnapStagedPlay[];
  seed: string;
  /** The original 12-card deck (cardId+level) captured at creation, for replay. */
  initialDeck: { cardId: string; level: number }[];
  status: SnapMatchStatus;
  scoring: SnapScore | null;
  eventLog: SnapEventLogEntry[];
  /** Full ordered action log (player plays) for server replay. */
  actionLog: SnapAction[];
  /** Survival/event context. */
  survivalWave?: number;
  isEvent?: boolean;
  /** Internal: ability flags reset per reveal (e.g. disabled on-reveals). */
  flags: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Modes                                                               */
/* ------------------------------------------------------------------ */

export interface SnapMode {
  id: SnapModeId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  accent: string;
  freeEntriesPerDay: number;
  entryCost: { tickets?: number; gems?: number } | null;
  unlockLevel: number;
  rewardSummary: string;
  requiresWalletForTokens: boolean;
}
