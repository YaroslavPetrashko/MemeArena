import type {
  BattleState,
  BattleCard,
  GameModeId,
  PlayerState,
  EnemyState,
  StatusEffect,
} from "@/types";
import { createRng, makeSeed, type Rng } from "./rng";
import { resolveCard } from "./upgrades";
import { applyCardEffect, type BattleFx } from "./cardEffects";
import { checkCombos } from "./comboEngine";
import { chooseBossMove, applyBossMove } from "./bossAI";
import { getBoss, BOSS_RUSH_ORDER } from "@/data/bosses";

const STARTING_ENERGY = 3;
const ENERGY_PER_TURN = 2;
const MAX_ENERGY = 7;
const STARTING_HAND = 4;
const MAX_HAND = 6;
const DRAW_PER_TURN = 1;
const DEFAULT_PLAYER_HP = 30;

export interface DeckCardInput {
  card_id: string;
  level: number;
}

export interface InitBattleArgs {
  mode: GameModeId;
  bossId: string;
  deck: DeckCardInput[];
  seed?: string;
  playerMaxHp?: number;
  wave?: number;
}

export interface PlayCardOutput {
  fx: BattleFx[];
  logs: string[];
  banners: string[];
  ok: boolean;
}

export interface EndTurnOutput {
  fx: BattleFx[];
  logs: string[];
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeBattleCards(deck: DeckCardInput[]): BattleCard[] {
  return deck.map((d, i) => {
    const resolved = resolveCard(d.card_id, d.level);
    return {
      uid: `${d.card_id}_${i}`,
      cardId: d.card_id,
      level: d.level,
      cost: resolved?.cost ?? 1,
    };
  });
}

function log(state: BattleState, text: string, kind: BattleState["log"][number]["kind"]) {
  state.log.push({ id: `${state.log.length}_${Date.now()}`, turn: state.turn, text, kind });
}

/** Survival picks a scaling boss based on the current wave. */
function survivalEnemy(wave: number): { bossId: string; maxHp: number } {
  const pool = BOSS_RUSH_ORDER.slice(0, 5);
  const bossId = pool[(wave - 1) % pool.length];
  const boss = getBoss(bossId)!;
  const scale = 1 + 0.18 * (wave - 1);
  return { bossId, maxHp: Math.round(boss.max_hp * 0.7 * scale) };
}

export function initBattle(args: InitBattleArgs): BattleState {
  const seed = args.seed ?? makeSeed();
  const rng = createRng(seed);

  let bossId = args.bossId;
  let maxHp: number;
  if (args.mode === "survival") {
    const s = survivalEnemy(args.wave ?? 1);
    bossId = s.bossId;
    maxHp = s.maxHp;
  } else {
    const boss = getBoss(bossId)!;
    maxHp = boss.max_hp;
  }
  const boss = getBoss(bossId)!;

  const fullDeck = shuffle(makeBattleCards(args.deck), rng);
  const hand = fullDeck.slice(0, STARTING_HAND);
  const drawPile = fullDeck.slice(STARTING_HAND);

  const player: PlayerState = {
    hp: args.playerMaxHp ?? DEFAULT_PLAYER_HP,
    maxHp: args.playerMaxHp ?? DEFAULT_PLAYER_HP,
    energy: STARTING_ENERGY,
    maxEnergy: MAX_ENERGY,
    shield: 0,
    statuses: [],
    deck: drawPile,
    hand,
    discard: [],
    nextCardDiscount: 0,
    pendingEnergy: 0,
    hype: false,
    nextAttackBonus: 0,
    guaranteedCrit: false,
    guaranteedStun: false,
    cardsPlayedThisTurn: 0,
  };

  const enemy: EnemyState = {
    bossId,
    name: boss.name,
    hp: maxHp,
    maxHp,
    shield: 0,
    statuses: [],
    intent: chooseBossMove(bossId, rng),
    turnCount: 0,
  };

  const state: BattleState = {
    battleId: `battle_${seed}`,
    mode: args.mode,
    bossId,
    seed,
    turn: 1,
    player,
    enemy,
    result: "ongoing",
    combosTriggered: [],
    cardPlayCounts: {},
    actionLog: [{ type: "start", turn: 1, timestamp: Date.now() }],
    damageDealt: 0,
    wave: args.wave,
    log: [],
  };

  log(state, `${boss.name} appears. ${boss.flavor}`, "system");
  return state;
}

function drawCards(state: BattleState, count: number, rng: Rng) {
  const p = state.player;
  for (let i = 0; i < count; i++) {
    if (p.hand.length >= MAX_HAND) break;
    if (p.deck.length === 0) {
      if (p.discard.length === 0) break;
      p.deck = shuffle(p.discard, rng);
      p.discard = [];
    }
    const card = p.deck.shift();
    if (card) p.hand.push(card);
  }
}

function tickStatuses(statuses: StatusEffect[]): StatusEffect[] {
  return statuses
    .map((s) => (s.duration > 0 ? { ...s, duration: s.duration - 1 } : s))
    .filter((s) => s.duration !== 0);
}

/** Play a card from hand by its uid. Returns FX/logs/banners and validity. */
export function playCard(state: BattleState, uid: string): PlayCardOutput {
  const empty: PlayCardOutput = { fx: [], logs: [], banners: [], ok: false };
  if (state.result !== "ongoing") return empty;

  const p = state.player;
  const idx = p.hand.findIndex((c) => c.uid === uid);
  if (idx < 0) return empty;
  const card = p.hand[idx];

  const resolved = resolveCard(card.cardId, card.level);
  const baseCost = resolved?.cost ?? card.cost;
  const cost = Math.max(0, baseCost - p.nextCardDiscount);
  if (p.energy < cost) return empty;

  // Spend resources + move card to discard.
  p.energy -= cost;
  p.nextCardDiscount = 0;
  p.hand.splice(idx, 1);
  p.discard.push(card);
  p.cardsPlayedThisTurn += 1;
  state.cardPlayCounts[card.cardId] = (state.cardPlayCounts[card.cardId] ?? 0) + 1;

  // Action log BEFORE resolution so "after another card" logic sees history.
  state.actionLog.push({
    type: "play_card",
    turn: state.turn,
    cardUid: uid,
    cardId: card.cardId,
    timestamp: Date.now(),
  });

  const rng = createRng(`${state.seed}_${state.actionLog.length}`);
  const res = applyCardEffect(state, card.cardId, card.level, rng);
  res.logs.forEach((l) => log(state, l, "player"));

  // Combos.
  const combo = checkCombos(state);
  combo.logs.forEach((l) => log(state, l, "combo"));

  // Draws from card + combos.
  drawCards(state, res.draw + combo.draw, rng);

  // Win check.
  if (state.enemy.hp <= 0) {
    state.result = "win";
    log(state, `${state.enemy.name} is defeated! GG.`, "reward");
  }

  return {
    fx: [...res.fx, ...combo.fx],
    logs: res.logs,
    banners: combo.triggered.map((c) => c.banner),
    ok: true,
  };
}

/** End the player's turn: resolve the boss action, tick statuses, refill. */
export function endTurn(state: BattleState): EndTurnOutput {
  const fx: BattleFx[] = [];
  const logs: string[] = [];
  if (state.result !== "ongoing") return { fx, logs };

  const rng = createRng(`${state.seed}_turn_${state.turn}`);
  const enemy = state.enemy;
  enemy.turnCount += 1;

  state.actionLog.push({ type: "end_turn", turn: state.turn, timestamp: Date.now() });

  // Burn tick on enemy.
  const enemyBurn = enemy.statuses.find((s) => s.type === "Burn");
  if (enemyBurn) {
    enemy.hp = Math.max(0, enemy.hp - enemyBurn.amount);
    fx.push({ kind: "damage", target: "enemy", value: enemyBurn.amount });
    logs.push(`${enemy.name} burns for ${enemyBurn.amount}.`);
    if (enemy.hp <= 0) {
      state.result = "win";
      enemy.statuses = tickStatuses(enemy.statuses);
      logs.forEach((l) => log(state, l, "enemy"));
      log(state, `${enemy.name} succumbs to Burn! GG.`, "reward");
      return { fx, logs };
    }
  }

  // Stun skips the boss move.
  const stunned = enemy.statuses.some((s) => s.type === "Stun");
  if (stunned) {
    logs.push(`${enemy.name} is STUNNED and loses its turn!`);
    fx.push({ kind: "stun", target: "enemy" });
  } else if (enemy.intent) {
    state.actionLog.push({ type: "boss_move", turn: state.turn, moveId: enemy.intent.id, timestamp: Date.now() });
    const move = applyBossMove(state, enemy.intent, rng);
    fx.push(...move.fx);
    logs.push(...move.logs);
  }

  // Moo Deng shield growth: every 2 turns unless stunned.
  if (enemy.bossId === "moo_deng_rampage" && !stunned && enemy.turnCount % 2 === 0) {
    enemy.shield += 6;
    fx.push({ kind: "shield", target: "enemy", value: 6 });
    logs.push(`${enemy.name}'s hide hardens (+6 shield).`);
  }

  logs.forEach((l) => log(state, l, "enemy"));

  // Loss check.
  if (state.player.hp <= 0) {
    state.result = "loss";
    log(state, "You have been defeated. GG.", "system");
    return { fx, logs };
  }

  // ----- Start the player's next turn -----
  state.turn += 1;
  const p = state.player;

  // Player Burn tick.
  const playerBurn = p.statuses.find((s) => s.type === "Burn");
  if (playerBurn) {
    let remaining = playerBurn.amount;
    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, remaining);
      p.shield -= absorbed;
      remaining -= absorbed;
    }
    p.hp = Math.max(0, p.hp - remaining);
    fx.push({ kind: "damage", target: "player", value: playerBurn.amount });
    log(state, `You burn for ${playerBurn.amount}.`, "system");
    if (p.hp <= 0) {
      state.result = "loss";
      log(state, "Burned out. GG.", "system");
      return { fx, logs };
    }
  }

  // Energy refill: scales +2/turn up to max, minus debuffs, plus pending.
  const baseTurnEnergy = Math.min(MAX_ENERGY, STARTING_ENERGY + ENERGY_PER_TURN * (state.turn - 1));
  const debuff = p.statuses.filter((s) => s.type === "Rugged" || s.type === "Confused").length;
  p.energy = Math.max(0, Math.min(MAX_ENERGY, baseTurnEnergy + p.pendingEnergy - debuff));
  p.pendingEnergy = 0;
  p.cardsPlayedThisTurn = 0;

  // Tick durations + decay player shield a little is intentionally NOT done
  // (shields persist for a tankier feel; rebalance here if needed).
  p.statuses = tickStatuses(p.statuses);
  enemy.statuses = tickStatuses(enemy.statuses);

  // Draw and set next intent.
  drawCards(state, DRAW_PER_TURN, rng);
  enemy.intent = chooseBossMove(enemy.bossId, createRng(`${state.seed}_intent_${state.turn}`));

  return { fx, logs };
}

/** Convenience: is the battle finished? */
export function isBattleOver(state: BattleState): boolean {
  return state.result !== "ongoing";
}

/**
 * Survival: advance to the next wave in the same run. Spawns a tougher enemy,
 * heals the player a little, resets the turn, and keeps the deck/discard so the
 * run feels continuous. Returns a fresh battle state object.
 */
export function advanceWave(prev: BattleState): BattleState {
  const wave = (prev.wave ?? 1) + 1;
  const seed = `${prev.seed}_wave_${wave}`;
  const rng = createRng(seed);
  const { bossId, maxHp } = survivalEnemy(wave);
  const boss = getBoss(bossId)!;

  const p = prev.player;
  // Small between-wave heal (25% of max), reset energy/turn buffs.
  const healed = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.25));
  // Reshuffle everything back into the draw pile and redraw a fresh hand.
  const allCards = shuffle([...p.deck, ...p.hand, ...p.discard], rng);
  const hand = allCards.slice(0, STARTING_HAND);
  const drawPile = allCards.slice(STARTING_HAND);

  const next: BattleState = {
    ...prev,
    battleId: `battle_${seed}`,
    seed,
    turn: 1,
    wave,
    result: "ongoing",
    combosTriggered: [],
    cardPlayCounts: {},
    actionLog: [{ type: "start", turn: 1, timestamp: Date.now() }],
    player: {
      ...p,
      hp: healed,
      energy: STARTING_ENERGY,
      shield: 0,
      statuses: [],
      deck: drawPile,
      hand,
      discard: [],
      nextCardDiscount: 0,
      pendingEnergy: 0,
      hype: false,
      nextAttackBonus: 0,
      guaranteedCrit: false,
      guaranteedStun: false,
      cardsPlayedThisTurn: 0,
    },
    enemy: {
      bossId,
      name: `${boss.name} · Wave ${wave}`,
      hp: maxHp,
      maxHp,
      shield: 0,
      statuses: [],
      intent: chooseBossMove(bossId, rng),
      turnCount: 0,
    },
    log: [],
  };
  log(next, `Wave ${wave}! ${boss.name} charges in.`, "system");
  return next;
}
