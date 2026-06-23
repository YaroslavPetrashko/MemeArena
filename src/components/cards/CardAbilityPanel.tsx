"use client";

import { Swords, Sparkles, Shield, Crown } from "lucide-react";
import type { ResolvedArenaProfile } from "@/types/arena";

const ROWS = [
  { key: "basicAttack", label: "Basic Attack", icon: Swords, unlock: 1, tone: "text-foreground" },
  { key: "specialAbility", label: "Special", icon: Sparkles, unlock: 1, tone: "text-magenta" },
  { key: "passiveAbility", label: "Passive", icon: Shield, unlock: 3, tone: "text-sky-300" },
  { key: "ultimateAbility", label: "Ultimate", icon: Crown, unlock: 5, tone: "text-gold" },
] as const;

/** Lists the card's four ability tiers with lock state by level. */
export function CardAbilityPanel({ profile }: { profile: ResolvedArenaProfile }) {
  return (
    <div className="space-y-2">
      {ROWS.map((row) => {
        const locked = profile.level < row.unlock;
        const text = profile[row.key];
        return (
          <div
            key={row.key}
            className={`rounded-xl border p-3 ${locked ? "border-white/8 bg-black/20 opacity-55" : "border-white/12 bg-white/5"}`}
          >
            <div className="flex items-center gap-2">
              <row.icon className={`size-4 ${locked ? "text-muted" : row.tone}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${locked ? "text-muted" : row.tone}`}>
                {row.label}
              </span>
              {locked && (
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted">
                  Unlocks Lv{row.unlock}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-snug text-muted">{text}</p>
          </div>
        );
      })}
    </div>
  );
}
