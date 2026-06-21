import type { ComboDefinition } from "@/types";

/**
 * Combos fire automatically when their card requirements are met within a
 * single battle. The combo engine (/lib/game/comboEngine.ts) checks these
 * after every card is played and shows an animated banner.
 */
export const COMBOS: ComboDefinition[] = [
  {
    id: "italian_brainrot",
    name: "Italian Brainrot",
    cards: ["ballerina_cappuccino", "bombardino_crocodilo", "tralalero_tralala"],
    effect: { bonusDamage: 10, applyStatus: ["Confused"] },
    banner: "🍝 ITALIAN BRAINROT!",
    description: "Ballerina Cappuccino + Bombardino Crocodilo + Tralalero Tralala → 10 bonus damage and Confused.",
  },
  {
    id: "sigma_formation",
    name: "Sigma Formation",
    cards: ["gigachad", "sigma_cat"],
    effect: { guaranteedCrit: true },
    banner: "🗿 SIGMA FORMATION!",
    description: "GigaChad + Sigma Cat → your next damage card is a guaranteed crit.",
  },
  {
    id: "3am_sahur",
    name: "3 AM Sahur",
    repeatCardId: "tung_tung_tung_sahur",
    repeatCount: 3,
    effect: { guaranteedStun: true, bonusDamage: 8 },
    banner: "🥁 3 AM SAHUR!",
    description: "Play Tung Tung Tung Sahur 3 times → guaranteed Stun and 8 bonus damage.",
  },
  {
    id: "were_so_back",
    name: "We're So Back",
    cards: ["wojak", "pepe_the_frog"],
    effect: { heal: 6, cleanse: 1 },
    banner: "📈 WE'RE SO BACK!",
    description: "Wojak + Pepe the Frog → heal 6 and cleanse 1 debuff.",
  },
  {
    id: "cat_supremacy",
    name: "Cat Supremacy",
    cards: ["mog_cat", "popcat", "sigma_cat"],
    effect: { bonusDamage: 6, draw: 2 },
    banner: "🐱 CAT SUPREMACY!",
    description: "Mog Cat + Popcat + Sigma Cat → 6 bonus damage and draw 2 cards.",
  },
  {
    id: "hat_mog",
    name: "Hat Mog",
    cards: ["dogwifhat", "mog_cat"],
    effect: { hype: true, nextAttackBonus: 4 },
    banner: "🎩 HAT MOG!",
    description: "Dogwifhat + Mog Cat → gain Hype and next attack +4.",
  },
  {
    id: "tiny_titans",
    name: "Tiny Titans",
    cards: ["peanut_the_squirrel", "moo_deng_hippo"],
    effect: { dodge: 1, shield: 6 },
    banner: "🐿️ TINY TITANS!",
    description: "Peanut the Squirrel + Moo Deng Hippo → gain 1 Dodge and 6 shield.",
  },
];

export const COMBOS_BY_ID: Record<string, ComboDefinition> = Object.fromEntries(
  COMBOS.map((c) => [c.id, c]),
);
