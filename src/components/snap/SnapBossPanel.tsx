"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { SnapMatchState } from "@/types/snap";
import { getSnapBoss } from "@/data/snapBosses";
import { bossIntentHint } from "@/lib/game/snap/bossIntent";

/** Boss avatar + a soft intent hint (never reveals exact plays). */
export function SnapBossPanel({ match }: { match: SnapMatchState }) {
  const boss = getSnapBoss(match.bossId);
  const [loaded, setLoaded] = useState(false);
  if (!boss) return null;
  const hint = bossIntentHint(match);

  return (
    <div className="flex items-center gap-3">
      <div className={cn("relative size-12 rounded-xl overflow-hidden ring-1 ring-red-500/40 shrink-0",
        "bg-gradient-to-br from-red-700/50 to-rose-950/70")}>
        <div className="absolute inset-0 grid place-items-center font-display font-black text-white/70 text-lg">
          {boss.name.slice(0, 1)}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={boss.imagePath}
          alt={boss.name}
          onLoad={() => setLoaded(true)}
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity",
            loaded ? "opacity-100" : "opacity-0")}
        />
      </div>
      <div className="min-w-0">
        <div className="font-display font-bold text-sm truncate">{boss.name}</div>
        <div className="text-[11px] text-red-300/80 italic truncate">{hint}</div>
      </div>
    </div>
  );
}
