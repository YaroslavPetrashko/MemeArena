"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { ArenaBossState } from "@/types/arena";

/** Telegraphs the boss's upcoming cast with a wind-up bar. */
export function BossIntentBar({ boss }: { boss: ArenaBossState }) {
  const casting = boss.windup > 0 && boss.windupTotal > 0;
  const frac = casting ? 1 - boss.windup / boss.windupTotal : 0;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/5 px-2.5 py-1 text-xs">
      <AlertTriangle className={`size-3.5 shrink-0 ${casting ? "text-red-400" : "text-muted"}`} />
      <span className="min-w-0 flex-1 truncate text-red-200">{boss.intent}</span>
      {casting && (
        <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-black/50">
          <motion.div className="h-full bg-red-400" animate={{ width: `${frac * 100}%` }} transition={{ duration: 0.1 }} />
        </div>
      )}
    </div>
  );
}
