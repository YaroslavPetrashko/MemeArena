// Lightweight, content-driven card guidance for the detail modal: synergy
// suggestions and strong/weak locations. Heuristic, not part of the engine.

import { SNAP_CARDS, SNAP_CARDS_BY_ID } from "../../../data/snapCards";
import { SNAP_LOCATIONS_BY_ID } from "../../../data/snapLocations";

/** Curated synergy pairs by card id; falls back to shared-tag matches. */
const SYNERGY: Record<string, string[]> = {
  pepe:          ["chillguy", "pengu", "doge"],
  doge:          ["pepe", "chillguy", "wojak"],
  chillguy:      ["pepe", "doge", "popcat"],
  wojak:         ["kekius_maximus", "troll", "doge"],
  pengu:         ["pepe", "popcat", "pnut"],
  popcat:        ["pengu", "chillguy", "solangeles"],
  pnut:          ["popcat", "pengu", "tung"],
  tung:          ["pnut", "retardio", "solangeles"],
  retardio:      ["tung", "chillguy"],
  dogwifhat:     ["crypto_bro_room", "wojak", "floki"],
  floki:         ["dogwifhat", "kekius_maximus"],
  kekius_maximus:["wojak", "floki", "garage_with_supercars"],
  troll:         ["wojak", "doge"],
  moodeng:       ["john_pork", "chillguy"],
  john_pork:     ["moodeng", "chillguy"],
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
  if (def.abilityType === "on_reveal") out.push("solangeles");
  if (def.power <= 3) out.push("chillhouse");
  if (def.power >= 5) out.push("miami");
  if (def.abilityId === "buffOthersHere" || def.abilityId === "ongoingBuffOthersHere") out.push("agartha");
  if (def.tags.includes("Finisher")) out.push("garage_with_supercars");
  return dedupeNames(out);
}

export function cardWeakLocations(cardId: string): string[] {
  const def = SNAP_CARDS_BY_ID[cardId];
  if (!def) return [];
  const out: string[] = [];
  if (def.power >= 5) out.push("wall_street");
  if (def.power <= 1) out.push("backrooms");
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
