import type { GemPackage } from "@/types";

/**
 * Gem packages purchased with MEMEARENA token (SPL transfer to treasury).
 * Amounts are configurable. Verification happens server-side in the
 * verify-token-purchase Edge Function before Gems are credited.
 */
export const GEM_PACKAGES: GemPackage[] = [
  { id: "gems_100", gems: 100, memearenaCost: 1000 },
  { id: "gems_550", gems: 550, memearenaCost: 5000, bonusLabel: "+10% bonus", popular: true },
  { id: "gems_1200", gems: 1200, memearenaCost: 10000, bonusLabel: "+20% bonus" },
];

export const GEM_PACKAGES_BY_ID: Record<string, GemPackage> = Object.fromEntries(
  GEM_PACKAGES.map((p) => [p.id, p]),
);

/** Gem sinks (what players spend Gems on). Used for the shop "spend" section. */
export const GEM_SINKS = [
  { id: "reroll", name: "Reward Reroll", cost: 20, description: "Reroll a battle's reward bracket once." },
  { id: "daily_boss_entry", name: "Daily Boss Extra Entry", cost: 25, description: "Fight the daily boss again today." },
  { id: "survival_entry", name: "Survival Extra Run", cost: 15, description: "One more Survival run." },
  { id: "event_entry", name: "Limited Event Entry", cost: 75, description: "Enter Brainrot Week." },
  { id: "upgrade_boost", name: "Upgrade Boost", cost: 30, description: "Skip Shard requirement on one upgrade." },
] as const;

/** Arena Ticket purchases with Gems (the grind-or-pay gate). */
export const TICKET_PACKAGES = [
  { id: "ticket_1", tickets: 1, gems: 20 },
  { id: "ticket_5", tickets: 5, gems: 90 },
] as const;
