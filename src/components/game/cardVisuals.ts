import {
  Swords,
  Shield,
  Heart,
  Sparkles,
  Zap,
  Bomb,
  Skull,
  Dices,
  Crown,
  Cat,
  Wind,
  Coins,
  type LucideIcon,
} from "lucide-react";
import type { CardRole, Rarity } from "@/types";

export const rarityGradient: Record<Rarity, string> = {
  Common: "from-zinc-600/60 to-zinc-800/80",
  Rare: "from-sky-500/50 to-indigo-800/70",
  Epic: "from-fuchsia-500/50 to-purple-900/70",
  Legendary: "from-amber-400/50 to-orange-800/70",
};

export const rarityGlow: Record<Rarity, string> = {
  Common: "glow-common",
  Rare: "glow-rare",
  Epic: "glow-epic",
  Legendary: "glow-legendary",
};

export const roleIcon: Record<CardRole, LucideIcon> = {
  Damage: Swords,
  "Heavy Damage": Bomb,
  Crit: Dices,
  Tank: Shield,
  Support: Heart,
  Control: Wind,
  Combo: Sparkles,
  Spam: Zap,
  Economy: Coins,
  Speed: Wind,
  Chaos: Dices,
  AoE: Bomb,
  Sacrifice: Skull,
  Finisher: Crown,
};

export const tagIcon: Record<string, LucideIcon> = {
  cat: Cat,
  frog: Heart,
  chad: Crown,
};

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
