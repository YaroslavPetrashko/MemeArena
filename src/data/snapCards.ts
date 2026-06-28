import type { SnapCardDef } from "@/types/snap";

/**
 * SNAP card pool — 15 meme cards, each with cost (Energy) and power (Strength).
 * `abilityId` maps to a pure handler in /lib/game/snap/snapAbilities.ts.
 * Image paths use /public/cards/<slug>.png; a gradient/initials placeholder is
 * shown when art is missing.
 */
export const SNAP_CARDS: SnapCardDef[] = [
  {
    id: "john_pork",
    name: "John Pork",
    slug: "john-pork",

    cost: 1,
    power: 1,
    abilityText: "No ability.",
    abilityType: "none",
    abilityId: null,
    tags: ["Simple", "Meme"],
    imagePath: "/cards/john-pork.png",
    flavor: "He's calling. Answer the phone.",
    levels: [
      { level: 1, description: "Vanilla 1 Power." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 2)." },
      { level: 3, powerBonus: 1, description: "+1 base Power (Power 3)." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 4)." },
      { level: 5, powerBonus: 1, description: "Premium frame. +1 base Power." },
    ],
  },
  {
    id: "moodeng",
    name: "Moodeng",
    slug: "moodeng",

    cost: 1,
    power: 2,
    abilityText: "Ongoing: This card's Power can't be reduced.",
    abilityType: "ongoing",
    abilityId: "ongoingCannotReducePower",
    tags: ["Animal", "Tank", "Ongoing"],
    imagePath: "/cards/moodeng.png",
    flavor: "Slippery, bouncy, absolutely unbothered.",
    levels: [
      { level: 1, description: "Power can't be reduced." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 3)." },
      { level: 3, powerBonus: 1, description: "+1 base Power (Power 4)." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 5)." },
      { level: 5, powerBonus: 1, description: "Premium frame. +1 base Power." },
    ],
  },
  {
    id: "chillguy",
    name: "Chillguy",
    slug: "chillguy",

    cost: 2,
    power: 2,
    abilityText: "Ongoing: Your other cards here have +1 Power.",
    abilityType: "ongoing",
    abilityId: "ongoingBuffOthersHere",
    tags: ["Meme", "Support", "Ongoing"],
    imagePath: "/cards/chill-guy.png",
    flavor: "Just a guy. Chillin'. Buffing the whole lane without trying.",
    levels: [
      { level: 1, description: "Other cards here +1 Power." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 3)." },
      { level: 3, abilityBonus: 1, description: "Other cards here +2 Power." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 4)." },
      { level: 5, abilityBonus: 1, description: "Premium frame. Others +3." },
    ],
  },
  {
    id: "pnut",
    name: "Pnut",
    slug: "pnut",

    cost: 2,
    power: 2,
    abilityText: "On Reveal: Next turn, you have +1 Energy.",
    abilityType: "on_reveal",
    abilityId: "rampEnergy",
    tags: ["Animal", "Ramp", "On Reveal"],
    imagePath: "/cards/pnut.png",
    flavor: "Gone too soon. Hoards energy like acorns.",
    levels: [
      { level: 1, description: "Next turn, +1 Energy." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 3)." },
      { level: 3, abilityBonus: 1, description: "Next turn, +2 Energy." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 4)." },
      { level: 5, powerBonus: 1, description: "Premium frame. +1 base Power." },
    ],
  },
  {
    id: "retardio",
    name: "Retardio",
    slug: "retardio",

    cost: 3,
    power: 2,
    abilityText: "On Reveal: A random friendly +3 Power or random enemy -3 Power.",
    abilityType: "on_reveal",
    abilityId: "chaosBuffOrDebuff",
    tags: ["Chaos", "Meme", "On Reveal"],
    imagePath: "/cards/retardio.png",
    flavor: "Special attack incoming. May or may not hit the right target.",
    levels: [
      { level: 1, description: "Random friendly +3 or enemy -3." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 3)." },
      { level: 3, abilityBonus: 1, description: "Effect magnitude raised to 4." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 4)." },
      { level: 5, abilityBonus: 1, description: "Premium frame. Magnitude 5." },
    ],
  },
  {
    id: "popcat",
    name: "Popcat",
    slug: "popcat",

    cost: 3,
    power: 6,
    abilityText: "On Reveal: Add a 1-Power Pop Token here if there is space.",
    abilityType: "on_reveal",
    abilityId: "spawnPopToken",
    tags: ["Cat", "Token", "On Reveal"],
    imagePath: "/cards/popcat.png",
    flavor: "Pop. Pop. Pop. Pop.",
    levels: [
      { level: 1, description: "Add a 1-Power Pop Token here." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 7)." },
      { level: 3, abilityBonus: 1, description: "Pop Token has 2 Power." },
      { level: 4, abilityBonus: 1, description: "Pop Token has 3 Power." },
      { level: 5, powerBonus: 1, description: "Premium frame. +1 base Power." },
    ],
  },
  {
    id: "tung",
    name: "Tung",
    slug: "tung",

    cost: 3,
    power: 4,
    abilityText: "On Reveal: Disable the next enemy On Reveal here this turn.",
    abilityType: "on_reveal",
    abilityId: "disableEnemyOnReveal",
    tags: ["Control", "On Reveal"],
    imagePath: "/cards/tung-tung-tung-sahur.png",
    flavor: "Tung tung tung... sahur. You hear it at 3AM. The enemy does not.",
    levels: [
      { level: 1, description: "Disable next enemy On Reveal here." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 5)." },
      { level: 3, powerBonus: 1, description: "+1 base Power (Power 6)." },
      { level: 4, abilityBonus: 1, description: "Disables enemy On Reveals all turn." },
      { level: 5, powerBonus: 1, description: "Premium frame. +1 base Power." },
    ],
  },
  {
    id: "dogwifhat",
    name: "Dogwifhat",
    slug: "dogwifhat",

    cost: 4,
    power: 4,
    abilityText: "If you are winning this location, this has +2 Power.",
    abilityType: "conditional",
    abilityId: "winningHereBonus",
    tags: ["Animal", "Hype", "Conditional"],
    imagePath: "/cards/wif.png",
    flavor: "Just a dog. With a hat. Wins harder when ahead.",
    levels: [
      { level: 1, description: "If winning here, +2 Power." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 5)." },
      { level: 3, abilityBonus: 1, description: "Bonus increased to +3 Power." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 6)." },
      { level: 5, abilityBonus: 1, description: "Premium frame. Bonus +4 Power." },
    ],
  },
  {
    id: "wojak",
    name: "Wojak",
    slug: "wojak",

    cost: 4,
    power: 6,
    abilityText: "On Reveal: Give the next card you play +2 Power.",
    abilityType: "on_reveal",
    abilityId: "buffNextPlayed",
    tags: ["Support", "Buff", "On Reveal"],
    imagePath: "/cards/wojak.png",
    flavor: "It's over. (It's not. Your next card's juiced.)",
    levels: [
      { level: 1, description: "Next card you play +2 Power." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 7)." },
      { level: 3, abilityBonus: 1, description: "Next card +3 Power." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 8)." },
      { level: 5, abilityBonus: 1, description: "Premium frame. Next card +4." },
    ],
  },
  {
    id: "floki",
    name: "Floki",
    slug: "floki",

    cost: 5,
    power: 7,
    abilityText: "Ongoing: Enemy cards here with 2 or less Power have -1 Power.",
    abilityType: "ongoing",
    abilityId: "ongoingDebuffSmallEnemiesHere",
    tags: ["Animal", "Ongoing", "Debuff"],
    imagePath: "/cards/floki.png",
    flavor: "Viking dog. Eats small threats for breakfast.",
    levels: [
      { level: 1, description: "Small enemies here -1 Power." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 8)." },
      { level: 3, abilityBonus: 1, description: "Affects 3-Power-or-less enemies." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 9)." },
      { level: 5, powerBonus: 1, description: "Premium frame. +1 base Power." },
    ],
  },
  {
    id: "pepe",
    name: "Pepe",
    slug: "pepe",

    cost: 5,
    power: 5,
    abilityText: "On Reveal: Give your other cards here +1 Power.",
    abilityType: "on_reveal",
    abilityId: "buffOthersHere",
    tags: ["Pepe", "Support", "On Reveal"],
    imagePath: "/cards/pepe.png",
    flavor: "Feels good, man. The OG lifts every lane he touches.",
    levels: [
      { level: 1, description: "Other cards here +1 Power." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 6)." },
      { level: 3, abilityBonus: 1, description: "Buff increased to +2 Power." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 7)." },
      { level: 5, abilityBonus: 1, description: "Premium frame. Buff +3 Power." },
    ],
  },
  {
    id: "pengu",
    name: "Pengu",
    slug: "pengu",

    cost: 5,
    power: 6,
    abilityText: "Ongoing: Your On Reveal cards here have +1 Power.",
    abilityType: "ongoing",
    abilityId: "ongoingBuffOnRevealHere",
    tags: ["Animal", "Ongoing", "Support"],
    imagePath: "/cards/pengu.png",
    flavor: "Tiny penguin. Huge aura. On Reveal cards thrive in his presence.",
    levels: [
      { level: 1, description: "Your On Reveal cards here +1 Power." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 7)." },
      { level: 3, abilityBonus: 1, description: "On Reveal cards here +2 Power." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 8)." },
      { level: 5, abilityBonus: 1, description: "Premium frame. +3." },
    ],
  },
  {
    // Internal id kept as `kekius_maximus` so existing boss decks / card guide
    // references stay valid; the depicted character is now Land Wolf.
    id: "kekius_maximus",
    name: "Land Wolf",
    slug: "land-wolf",

    cost: 4,
    power: 6,
    abilityText: "If this is your only card here, +4 Power.",
    abilityType: "conditional",
    abilityId: "aloneHereBonus",
    tags: ["Finisher", "Conditional"],
    imagePath: "/cards/land-wolf.png",
    flavor: "Lone wolf energy. Strongest when he stands alone.",
    levels: [
      { level: 1, description: "If alone here, +4 Power." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 7)." },
      { level: 3, abilityBonus: 1, description: "Alone bonus increased to +5." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 8)." },
      { level: 5, abilityBonus: 1, description: "Premium frame. Alone bonus +6." },
    ],
  },
  {
    id: "troll",
    name: "Troll",
    slug: "troll",

    cost: 6,
    power: 10,
    abilityText: "End of game: Swap this card's Power with the strongest enemy here.",
    abilityType: "end_game",
    abilityId: "swapPowerEndGame",
    tags: ["Manipulation", "End Game"],
    imagePath: "/cards/troll.png",
    flavor: "Lives under the bridge. Ruins everything at the last second.",
    levels: [
      { level: 1, description: "Swap Power with strongest enemy here." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 11)." },
      { level: 3, powerBonus: 1, description: "+1 base Power (Power 12)." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 13)." },
      { level: 5, powerBonus: 1, description: "Premium frame. +1 base Power." },
    ],
  },
  {
    id: "doge",
    name: "Doge",
    slug: "doge",

    cost: 6,
    power: 8,
    abilityText: "On Reveal: Give your other cards here +2 Power.",
    abilityType: "on_reveal",
    abilityId: "buffOthersHere",
    tags: ["Animal", "Buff", "On Reveal"],
    imagePath: "/cards/doge.png",
    flavor: "Such power. Much buff. Wow.",
    levels: [
      { level: 1, powerBonus: 0, abilityBonus: 1, description: "Other cards here +2 Power." },
      { level: 2, powerBonus: 1, description: "+1 base Power (Power 9)." },
      { level: 3, abilityBonus: 1, description: "Other cards here +3 Power." },
      { level: 4, powerBonus: 1, description: "+1 base Power (Power 10)." },
      { level: 5, abilityBonus: 1, description: "Premium frame. Others +4." },
    ],
  },
];

/* ---- Engine-only token definitions (not in player pools) ---- */
export const SNAP_TOKENS: Record<string, SnapCardDef> = {
  pop_token: {
    id: "pop_token",
    name: "Pop Token",
    slug: "pop-token",

    cost: 0,
    power: 1,
    abilityText: "No ability.",
    abilityType: "none",
    abilityId: null,
    tags: ["Token"],
    imagePath: "/cards/popcat.png",
    flavor: "Pop.",
    levels: [{ level: 1, description: "1 Power token." }],
    isToken: true,
  },
};

export const SNAP_CARDS_BY_ID: Record<string, SnapCardDef> = Object.fromEntries(
  SNAP_CARDS.map((c) => [c.id, c]),
);

/** Lookup that also resolves engine tokens. */
export function getSnapCardDef(id: string): SnapCardDef | undefined {
  return SNAP_CARDS_BY_ID[id] ?? SNAP_TOKENS[id];
}

/** Base power for a card at a given level (level upgrades stack additively). */
export function snapCardPowerAtLevel(def: SnapCardDef, level: number): number {
  let p = def.power;
  for (const lv of def.levels) {
    if (lv.level <= level) p += lv.powerBonus ?? 0;
  }
  return p;
}

/** Cost for a card at a given level. */
export function snapCardCostAtLevel(def: SnapCardDef, level: number): number {
  let c = def.cost;
  for (const lv of def.levels) {
    if (lv.level <= level) c -= lv.costReduction ?? 0;
  }
  return Math.max(0, c);
}

/** Cumulative ability bonus from levels (interpreted per-ability handler). */
export function snapCardAbilityBonusAtLevel(def: SnapCardDef, level: number): number {
  let b = 0;
  for (const lv of def.levels) {
    if (lv.level <= level) b += lv.abilityBonus ?? 0;
  }
  return b;
}

/** The 12-card SNAP starter deck. */
export const SNAP_STARTER_DECK_IDS: string[] = [
  "john_pork",
  "moodeng",
  "chillguy",
  "pnut",
  "retardio",
  "popcat",
  "tung",
  "dogwifhat",
  "wojak",
  "floki",
  "pepe",
  "pengu",
];

export const SNAP_DECK_SIZE = 12;
