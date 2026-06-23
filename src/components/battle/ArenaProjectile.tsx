"use client";

import { memo } from "react";
import type { ArenaProjectile as Projectile } from "@/types/arena";

const EFFECT_STYLE: Record<string, { color: string; w: number; h: number }> = {
  pop: { color: "#ffd24a", w: 8, h: 8 },
  bolt: { color: "#b6ff1b", w: 6, h: 12 },
  note: { color: "#ff2bd6", w: 9, h: 9 },
  dagger: { color: "#e5e5ef", w: 5, h: 14 },
  acorn: { color: "#caa86a", w: 7, h: 9 },
  claw: { color: "#c46bff", w: 10, h: 6 },
};

function ArenaProjectileInner({ p, x, y }: { p: Projectile; x: number; y: number }) {
  const s = EFFECT_STYLE[p.effectType] ?? EFFECT_STYLE.bolt;
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", zIndex: 40 }}
    >
      <div
        style={{
          width: s.w,
          height: s.h,
          borderRadius: 999,
          background: s.color,
          boxShadow: `0 0 8px 2px ${s.color}`,
        }}
      />
      {/* trail */}
      <div
        className="absolute left-1/2 top-1/2 -z-10"
        style={{
          width: s.w * 0.6,
          height: 18,
          transform: "translate(-50%, -10%)",
          background: `linear-gradient(${p.owner === "player" ? "180deg" : "0deg"}, ${s.color}, transparent)`,
          opacity: 0.5,
          filter: "blur(1px)",
        }}
      />
    </div>
  );
}

export const ArenaProjectile = memo(ArenaProjectileInner);
