"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { ArenaBattleState, Lane } from "@/types/arena";
import { ArenaUnitToken } from "./ArenaUnitToken";
import { ArenaProjectile } from "./ArenaProjectile";
import { ArenaHazardZone } from "./ArenaHazardZone";
import { FloatingDamageNumber } from "./FloatingDamageNumber";
import { hazardThemeColor } from "./arenaVisuals";
import { ARENA_CONFIG } from "@/data/arenaEconomy";

/**
 * The 2.5D arena floor. Three lanes run vertically; the boss core is at the top
 * (position 100 → y≈6%) and the player base at the bottom (position 0 → y≈94%).
 * A slight horizontal inset near the top fakes perspective depth.
 */

// Pre-computed ambient particle positions (static seed → no hydration churn).
const PARTICLE_COLORS = ["rgba(182,255,27,0.6)", "rgba(255,43,214,0.5)", "rgba(80,220,255,0.5)"];
const AMBIENT_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37) % 100,
  y: (i * 53) % 80,
  d: (i % 9) * 0.5,
  c: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
}));

// Vertical mapping: position 0 → bottom, 100 → top.
function yForPos(pos: number): number {
  return 94 - (pos / 100) * 88; // 94%..6%
}

// Lane horizontal center, with mild perspective narrowing toward the top.
const LANE_CENTERS = [22, 50, 78];
function laneGeometry(lane: Lane, pos: number) {
  const center = LANE_CENTERS[lane];
  const persp = 1 - (pos / 100) * 0.18; // narrower at the top
  const x = 50 + (center - 50) * persp;
  return { x, width: 26 * persp };
}

function ArenaBoardInner({
  state,
  frame,
  selecting,
  onLaneClick,
}: {
  state: ArenaBattleState;
  frame: number;
  selecting: boolean;
  onLaneClick: (lane: Lane) => void;
}) {
  void frame; // re-render trigger; engine mutates state in place
  const deployY = yForPos(ARENA_CONFIG.deployZoneMax);

  return (
    <div className="relative h-full w-full select-none overflow-hidden rounded-2xl border border-white/10">
      {/* floor base + perspective gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #150d1f 0%, #0c0c16 45%, #0a1015 100%)",
        }}
      />
      {/* perspective floor grid */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(180deg, transparent, black 30%, black 80%, transparent)",
          transform: "perspective(420px) rotateX(34deg) scale(1.25)",
          transformOrigin: "center 40%",
        }}
      />

      {/* ambient drifting particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {AMBIENT_PARTICLES.map((p, i) => (
          <span
            key={i}
            className="arena-particle"
            style={{ left: `${p.x}%`, bottom: `${p.y}%`, animationDelay: `${p.d}s`, background: p.c }}
          />
        ))}
      </div>

      {/* lane dividers + deploy/danger zones */}
      <div className="absolute inset-0">
        {([0, 1, 2] as Lane[]).map((lane) => {
          const top = laneGeometry(lane, 100);
          const bot = laneGeometry(lane, 0);
          return (
            <div key={lane}>
              {/* glowing divider on the right edge of each lane (except last) */}
              {lane < 2 && (
                <div
                  className="absolute top-0 h-full"
                  style={{
                    left: `${(laneGeometry(lane, 50).x + laneGeometry((lane + 1) as Lane, 50).x) / 2}%`,
                    width: 2,
                    background: "linear-gradient(180deg, transparent, rgba(182,255,27,0.25), rgba(255,43,214,0.25), transparent)",
                    boxShadow: "0 0 8px rgba(182,255,27,0.3)",
                  }}
                />
              )}
              {/* clickable lane column (trapezoid via clip-path for perspective) */}
              <button
                onClick={() => onLaneClick(lane)}
                className="absolute top-0 h-full transition-colors"
                style={{
                  left: `${Math.min(top.x - top.width / 2, bot.x - bot.width / 2)}%`,
                  width: `${Math.max(top.width, bot.width)}%`,
                  cursor: selecting ? "pointer" : "default",
                }}
                aria-label={`Lane ${lane + 1}`}
              />
            </div>
          );
        })}

        {/* deploy zone highlight (lower band) */}
        <motion.div
          className="pointer-events-none absolute inset-x-0"
          style={{ top: `${deployY}%`, bottom: 0 }}
          animate={{ opacity: selecting ? [0.35, 0.6, 0.35] : 0.12 }}
          transition={{ duration: 1, repeat: selecting ? Infinity : 0 }}
        >
          <div
            className="h-full w-full"
            style={{
              background: "linear-gradient(180deg, rgba(182,255,27,0.12), rgba(182,255,27,0.04))",
              borderTop: "1px dashed rgba(182,255,27,0.5)",
            }}
          />
        </motion.div>
      </div>

      {/* hazards (under units) */}
      {state.hazards.map((hz) => {
        const geo = laneGeometry(hz.lane, (hz.startPosition + hz.endPosition) / 2);
        return (
          <ArenaHazardZone
            key={hz.id}
            hz={hz}
            laneX={geo.x - geo.width / 2}
            laneW={geo.width}
            yForPos={yForPos}
          />
        );
      })}

      {/* decals (floor marks) */}
      {state.decals.map((d) => {
        const geo = laneGeometry(d.lane, d.position);
        const isDeath = d.theme === "death";
        const col = isDeath
          ? { core: "rgba(255,255,255,0.25)", edge: "rgba(255,255,255,0.4)" }
          : d.theme === "ability"
            ? { core: "rgba(182,255,27,0.2)", edge: "rgba(182,255,27,0.5)" }
            : hazardThemeColor[d.theme as keyof typeof hazardThemeColor] ?? { core: "rgba(255,255,255,0.2)", edge: "rgba(255,255,255,0.4)" };
        return (
          <motion.div
            key={d.id}
            className="pointer-events-none absolute rounded-full"
            style={{ left: `${geo.x}%`, top: `${yForPos(d.position)}%`, width: 30, height: 12, transform: "translate(-50%,-50%)", background: col.core, border: `1px solid ${col.edge}` }}
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: d.ttlTotal / 1000 }}
          />
        );
      })}

      {/* projectiles */}
      {state.projectiles.map((p) => {
        const geo = laneGeometry(p.lane, p.currentPosition);
        return <ArenaProjectile key={p.id} p={p} x={geo.x} y={yForPos(p.currentPosition)} />;
      })}

      {/* units */}
      {state.units.map((u) => {
        const geo = laneGeometry(u.lane, u.position);
        const size = u.role === "tank" ? 46 : u.role === "runner" ? 30 : u.cardId === "_brute" ? 48 : 38;
        return (
          <ArenaUnitToken
            key={u.id}
            unit={u}
            x={geo.x}
            y={yForPos(u.position)}
            size={size}
          />
        );
      })}

      {/* floating numbers */}
      {state.floats.map((f) => {
        const geo = laneGeometry(f.lane, f.position);
        return <FloatingDamageNumber key={f.id} f={f} x={geo.x} y={yForPos(f.position)} />;
      })}

      {/* vignette */}
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 90px 30px rgba(0,0,0,0.65)" }} />

      {/* boss danger glow at top, base glow at bottom */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16" style={{ background: "linear-gradient(180deg, rgba(255,40,60,0.18), transparent)" }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14" style={{ background: "linear-gradient(0deg, rgba(182,255,27,0.14), transparent)" }} />
    </div>
  );
}

export const ArenaBoard = memo(ArenaBoardInner, (a, b) => a.frame === b.frame && a.selecting === b.selecting);
