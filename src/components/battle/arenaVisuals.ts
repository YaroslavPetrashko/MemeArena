import type { Rarity } from "@/types";
import type { ArenaRole, HazardTheme } from "@/types/arena";

/** Stable per-card hue so placeholder tokens are colorful + recognizable. */
export function cardHue(cardId: string): number {
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = (h * 31 + cardId.charCodeAt(i)) % 360;
  return h;
}

/** Gradient for a card's avatar chip (placeholder-safe). */
export function tokenGradient(cardId: string): string {
  const h = cardHue(cardId);
  return `linear-gradient(150deg, hsl(${h} 70% 45%), hsl(${(h + 40) % 360} 65% 22%))`;
}

export const rarityRing: Record<Rarity, string> = {
  Common: "#9aa0ad",
  Rare: "#4ea8ff",
  Epic: "#c46bff",
  Legendary: "#ffce4a",
};

export const rarityGlowColor: Record<Rarity, string> = {
  Common: "rgba(154,160,173,0.5)",
  Rare: "rgba(78,168,255,0.6)",
  Epic: "rgba(196,107,255,0.65)",
  Legendary: "rgba(255,206,74,0.7)",
};

/** Short role glyph for the token corner. */
export const roleGlyph: Record<ArenaRole, string> = {
  melee: "⚔",
  ranged: "✸",
  assassin: "🗡",
  tank: "🛡",
  support: "✚",
  runner: "»",
  spell: "✷",
  decoy: "☻",
};

export function cardInitials(cardId: string, name?: string): string {
  const base = name ?? cardId.replace(/_/g, " ");
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Minion/wave fallback labels for boss-spawned units. */
export const MINION_LABELS: Record<string, { label: string; hue: number }> = {
  _bot: { label: "BOT", hue: 200 },
  _scam: { label: "SCM", hue: 330 },
  _splash: { label: "TDE", hue: 195 },
  _wave: { label: "ADD", hue: 0 },
  _brute: { label: "BRT", hue: 280 },
};

export const hazardThemeColor: Record<HazardTheme, { core: string; edge: string }> = {
  fire: { core: "rgba(255,90,40,0.5)", edge: "rgba(255,140,40,0.9)" },
  energy: { core: "rgba(120,255,140,0.4)", edge: "rgba(120,255,180,0.9)" },
  rug: { core: "rgba(200,40,255,0.4)", edge: "rgba(255,60,120,0.9)" },
  digital: { core: "rgba(60,160,255,0.4)", edge: "rgba(120,200,255,0.9)" },
  water: { core: "rgba(40,140,255,0.4)", edge: "rgba(120,200,255,0.9)" },
  chart: { core: "rgba(255,60,80,0.4)", edge: "rgba(120,255,140,0.9)" },
  vampire: { core: "rgba(170,30,200,0.45)", edge: "rgba(220,40,120,0.9)" },
  stomp: { core: "rgba(255,180,60,0.4)", edge: "rgba(255,140,40,0.9)" },
  stun: { core: "rgba(120,140,255,0.4)", edge: "rgba(160,180,255,0.9)" },
  chaos: { core: "rgba(255,80,220,0.4)", edge: "rgba(180,120,255,0.9)" },
  gold: { core: "rgba(255,210,74,0.4)", edge: "rgba(255,230,120,0.9)" },
};

export const COMBO_PALETTE: Record<string, { glow: string; text: string }> = {
  magenta: { glow: "rgba(255,43,214,0.5)", text: "#ff2bd6" },
  lime: { glow: "rgba(182,255,27,0.5)", text: "#b6ff1b" },
  gold: { glow: "rgba(255,210,74,0.55)", text: "#ffd24a" },
  indigo: { glow: "rgba(120,120,255,0.5)", text: "#9aa6ff" },
  emerald: { glow: "rgba(60,220,140,0.5)", text: "#3cdc8c" },
  purple: { glow: "rgba(180,90,255,0.5)", text: "#b45aff" },
  cyan: { glow: "rgba(60,220,255,0.5)", text: "#3cdcff" },
  red: { glow: "rgba(255,70,70,0.5)", text: "#ff4646" },
};
