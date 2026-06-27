// Lightweight, content-driven card guidance for the detail modal: synergy
// suggestions, strong/weak locations, and boss matchup hints. Heuristic, not
// part of the deterministic engine.

import { SNAP_CARDS, SNAP_CARDS_BY_ID } from "../../../data/snapCards";
import { SNAP_LOCATIONS_BY_ID } from "../../../data/snapLocations";

/** Curated synergy pairs by card id; falls back to shared-tag matches. */
const SYNERGY: Record<string, string[]> = {
  pepe_the_frog: ["sigma_cat", "rare_pepe", "bull_run"],
  bull_run: ["pepe_the_frog", "sigma_cat", "wojak"],
  wojak: ["gigachad", "whale", "bull_run"],
  hype_man: ["gigachad", "alpha_caller", "wojak"],
  alpha_caller: ["hype_man", "wojak"],
  sigma_cat: ["pepe_the_frog", "mog_cat", "rare_pepe"],
  rare_pepe: ["pepe_the_frog", "hype_man", "tralalero_tralala"],
  popcat: ["sigma_cat", "bull_run"],
  bot_minion: ["sigma_cat", "bear_market"],
  gigachad: ["wojak", "hype_man"],
  whale: ["bear_market", "diamond_hands"],
  market_maker: ["diamond_hands", "bear_market"],
  cappuccino_assassin: ["bombardino_crocodilo", "bear_market"],
  bombardino_crocodilo: ["cappuccino_assassin", "liquidity_vampire"],
  liquidity_vampire: ["bombardino_crocodilo", "bear_market"],
  rug_pull_goblin: ["cappuccino_assassin", "bombardino_crocodilo"],
  diamond_hands: ["whale", "moo_deng_hippo", "market_maker"],
  moo_deng_hippo: ["sigma_cat", "diamond_hands"],
};

export function cardSynergies(cardId: string): string[] {
  const ids = SYNERGY[cardId];
  if (ids) return ids.map((id) => SNAP_CARDS_BY_ID[id]?.name).filter(Boolean) as string[];
  // Fallback: cards sharing the first tag.
  const def = SNAP_CARDS_BY_ID[cardId];
  if (!def) return [];
  const tag = def.tags[0];
  return SNAP_CARDS.filter((c) => c.id !== cardId && c.tags.includes(tag))
    .slice(0, 3)
    .map((c) => c.name);
}

export function cardStrongLocations(cardId: string): string[] {
  const def = SNAP_CARDS_BY_ID[cardId];
  if (!def) return [];
  const out: string[] = [];
  if (def.abilityType === "on_reveal") out.push("degen_alley");
  if (def.power <= 3) out.push("bull_run");
  if (def.power >= 5) out.push("pump_plaza");
  if (def.abilityId === "buffOthersHere" || def.abilityId === "ongoingBuffOthersHere") out.push("pump_plaza");
  if (def.tags.includes("Token")) out.push("meme_factory");
  if (def.tags.includes("Finisher")) out.push("final_candle");
  return dedupeNames(out);
}

export function cardWeakLocations(cardId: string): string[] {
  const def = SNAP_CARDS_BY_ID[cardId];
  if (!def) return [];
  const out: string[] = [];
  if (def.power >= 5) out.push("bear_market");
  if (def.cost >= 4) out.push("gas_war");
  if (def.tags.includes("Move") || def.abilityId === "moveSelfGainPower") out.push("diamond_hands");
  if (def.power <= 1) out.push("rug_zone");
  return dedupeNames(out);
}

function dedupeNames(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const name = SNAP_LOCATIONS_BY_ID[id]?.name;
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out.slice(0, 3);
}
