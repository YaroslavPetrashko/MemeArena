"use client";

import { motion } from "framer-motion";
import type { ArenaBossState } from "@/types/arena";
import { getBoss } from "@/data/bosses";
import { cardInitials } from "./arenaVisuals";

/** Top objective: the boss core with a chunky HP bar + phase pips. */
export function BossCore({ boss, coreShield }: { boss: ArenaBossState; coreShield: number }) {
  const legacy = getBoss(boss.bossId);
  const frac = Math.max(0, boss.coreHp / boss.coreMaxHp);
  const shieldFrac = Math.min(1, coreShield / boss.coreMaxHp);

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        {/* core portrait */}
        <motion.div
          className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-red-500/60"
          animate={{ boxShadow: ["0 0 18px rgba(255,60,70,0.4)", "0 0 30px rgba(255,60,70,0.7)", "0 0 18px rgba(255,60,70,0.4)"] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ background: "radial-gradient(circle at 50% 30%, #ff5a6a, #4a0010)" }}
        >
          {legacy?.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={legacy.image_path} alt="" className="h-full w-full object-cover" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
          ) : null}
          <span className="absolute font-display text-lg font-bold text-white/90 drop-shadow">{cardInitials(boss.bossId, boss.name)}</span>
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="truncate font-display text-sm font-bold sm:text-base">{boss.name}</h2>
            <span className="shrink-0 text-xs tabular-nums text-red-300">
              {Math.ceil(boss.coreHp).toLocaleString()}/{boss.coreMaxHp.toLocaleString()}
            </span>
          </div>

          {/* HP bar */}
          <div className="relative mt-1 h-3 overflow-hidden rounded-full border border-white/10 bg-black/50">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: "linear-gradient(90deg,#ff3b3b,#ff7a5a)" }}
              animate={{ width: `${frac * 100}%` }}
              transition={{ duration: 0.3 }}
            />
            {shieldFrac > 0 && (
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full border-r-2 border-sky-200/80"
                style={{ background: "linear-gradient(90deg, rgba(92,200,255,0.45), rgba(92,200,255,0.15))" }}
                animate={{ width: `${Math.min(100, (frac + shieldFrac) * 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            )}
          </div>

          {/* phase pips */}
          <div className="mt-1 flex items-center gap-1">
            {[0, 1, 2, 3].map((p) => (
              <span
                key={p}
                className={`h-1 flex-1 rounded-full ${p <= boss.phase ? "bg-gold" : "bg-white/15"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
