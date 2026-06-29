"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Skull } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SnapMatchState } from "@/types/snap";
import { getSnapBoss } from "@/data/snapBosses";

/** Compact opponent banner: hex portrait + name only. */
export function SnapBossHeader({ match }: { match: SnapMatchState }) {
  const boss = getSnapBoss(match.bossId);
  const [loaded, setLoaded] = useState(false);
  if (!boss) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mx-auto flex w-fit items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-red-950/60 via-rose-900/30 to-red-950/40 px-3 py-1.5 ring-1 ring-red-500/25"
    >
      {/* hex portrait */}
      <div className="relative size-9 shrink-0 overflow-hidden snap-hex bg-gradient-to-br from-red-700/60 to-rose-950/80 ring-1 ring-red-400/40">
        <div className="absolute inset-0 grid place-items-center font-display text-sm font-black text-white/70">
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

      <div className="flex items-center gap-1.5">
        <Skull className="size-3.5 shrink-0 text-red-400" />
        <span className="font-display text-sm font-black text-white">{boss.name}</span>
      </div>
    </motion.div>
  );
}
