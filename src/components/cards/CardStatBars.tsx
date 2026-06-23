"use client";

import { motion } from "framer-motion";
import type { CardStats, StatKey } from "@/types/arena";
import { STAT_LABELS, STAT_ORDER } from "@/lib/game/cardOvr";

function barColor(v: number): string {
  if (v >= 85) return "#b6ff1b";
  if (v >= 70) return "#9be23a";
  if (v >= 50) return "#ffd24a";
  if (v >= 35) return "#ff9a4a";
  return "#ff6a6a";
}

/** Animated horizontal stat bars with optional "next level" ghost delta. */
export function CardStatBars({
  stats,
  nextStats,
}: {
  stats: CardStats;
  nextStats?: CardStats | null;
}) {
  return (
    <div className="space-y-2">
      {STAT_ORDER.map((key: StatKey, i) => {
        const v = stats[key];
        const nv = nextStats?.[key];
        const delta = nv != null ? nv - v : 0;
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-medium text-muted">{STAT_LABELS[key]}</span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/8">
              {/* next-level ghost fill */}
              {nv != null && delta > 0 && (
                <div className="absolute inset-y-0 left-0 rounded-full bg-lime/25" style={{ width: `${nv}%` }} />
              )}
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: barColor(v) }}
                initial={{ width: 0 }}
                animate={{ width: `${v}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-bold tabular-nums">
              {v}
              {delta > 0 && <span className="ml-0.5 text-[10px] text-lime">+{delta}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
