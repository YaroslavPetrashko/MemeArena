"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Skull } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SnapMatchState } from "@/types/snap";
import { getSnapBoss } from "@/data/snapBosses";
import { bossIntentHint } from "@/lib/game/snap/bossIntent";

const PERSONALITY_TAG: Record<string, string> = {
  aggressive: "Aggressive",
  disruptive: "Disruptive",
  greedy: "Greedy",
  wide: "Wide",
  stacker: "Stacker",
  chaotic: "Chaotic",
};

function difficultyLabel(d: number | string) {
  if (typeof d === "number") return "★".repeat(Math.min(5, d)) || "★";
  return String(d).toUpperCase();
}

/** Cinematic opponent banner: hex portrait, name, difficulty, live intent. */
export function SnapBossHeader({ match }: { match: SnapMatchState }) {
  const boss = getSnapBoss(match.bossId);
  const [loaded, setLoaded] = useState(false);
  if (!boss) return null;
  const hint = bossIntentHint(match);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/60 via-rose-900/30 to-transparent px-3 py-2.5 ring-1 ring-red-500/25"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_0%_50%,rgba(255,43,90,0.18),transparent_70%)]" />

      {/* hex portrait */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "relative size-14 overflow-hidden snap-hex bg-gradient-to-br from-red-700/60 to-rose-950/80 ring-1 ring-red-400/40",
          )}
        >
          <div className="absolute inset-0 grid place-items-center font-display text-xl font-black text-white/70">
            {boss.name.slice(0, 1)}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={boss.imagePath}
            alt={boss.name}
            onLoad={() => setLoaded(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-1.5 text-[9px] font-black text-amber-300 ring-1 ring-amber-400/40">
          {difficultyLabel(boss.difficulty)}
        </span>
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Skull className="size-3.5 shrink-0 text-red-400" />
          <span className="truncate font-display text-base font-black text-white">{boss.name}</span>
          <span className="hidden shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-300 sm:inline">
            {PERSONALITY_TAG[boss.personality] ?? boss.personality}
          </span>
        </div>
        <motion.div
          key={hint}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-0.5 truncate text-[11px] italic text-red-200/80"
        >
          {hint}
        </motion.div>
      </div>
    </motion.div>
  );
}
