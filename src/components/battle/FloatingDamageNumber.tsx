"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { ArenaFloat } from "@/types/arena";

const STYLES: Record<string, { color: string; prefix: string; size: string }> = {
  damage: { color: "#ff5a5a", prefix: "-", size: "text-base" },
  crit: { color: "#ffd24a", prefix: "-", size: "text-xl" },
  heal: { color: "#4ade80", prefix: "+", size: "text-base" },
  shield: { color: "#5cc8ff", prefix: "+", size: "text-sm" },
  energy: { color: "#b6ff1b", prefix: "+", size: "text-base" },
  stun: { color: "#fde047", prefix: "", size: "text-sm" },
  miss: { color: "#cbd5e1", prefix: "", size: "text-xs" },
};

function FloatingDamageNumberInner({ f, x, y }: { f: ArenaFloat; x: number; y: number }) {
  const s = STYLES[f.kind] ?? STYLES.damage;
  const text =
    f.label ??
    (f.kind === "crit"
      ? `${s.prefix}${f.value} CRIT`
      : `${s.prefix}${f.value ?? ""}${f.kind === "shield" ? "🛡" : f.kind === "energy" ? "⚡" : ""}`);
  return (
    <motion.div
      className="pointer-events-none absolute z-50 select-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, y: 0, scale: 0.7 }}
      animate={{ opacity: [0, 1, 1, 0], y: -26, scale: [0.7, 1.15, 1, 0.95] }}
      transition={{ duration: 0.85, times: [0, 0.2, 0.7, 1] }}
    >
      <span
        className={`font-display font-extrabold ${s.size}`}
        style={{ color: s.color, textShadow: "0 2px 6px rgba(0,0,0,0.9)", transform: "translateX(-50%)", display: "inline-block" }}
      >
        {text}
      </span>
    </motion.div>
  );
}

export const FloatingDamageNumber = memo(FloatingDamageNumberInner);
