"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ArenaUnit } from "@/types/arena";
import { getCard } from "@/data/cards";
import {
  tokenGradient,
  rarityRing,
  rarityGlowColor,
  roleGlyph,
  cardInitials,
  MINION_LABELS,
} from "./arenaVisuals";

/**
 * A living "arena token": a circular avatar chip with an HP ring, rarity glow,
 * idle bob, and one-shot animations for spawn / attack / hit / death / dash.
 * Position is supplied by the board as x/y percentages; framer-motion glides
 * between updates so units never teleport.
 */
function ArenaUnitTokenInner({
  unit,
  x,
  y,
  size,
}: {
  unit: ArenaUnit;
  x: number;
  y: number;
  size: number;
}) {
  const card = getCard(unit.cardId);
  const minion = MINION_LABELS[unit.cardId];
  const isPlayer = unit.owner === "player";
  const hpFrac = Math.max(0, unit.hp / unit.maxHp);
  const shieldFrac = Math.min(1, unit.shield / unit.maxHp);

  // Consume one-shot visual events.
  const [flash, setFlash] = useState<string | null>(null);
  const [dying, setDying] = useState(false);
  const lastLen = useRef(0);
  useEffect(() => {
    const evs = unit.visualEvents;
    if (evs.length === lastLen.current) return;
    const recent = evs.slice(lastLen.current);
    lastLen.current = evs.length;
    if (recent.includes("death")) setDying(true);
    else if (recent.includes("attack")) pulse("attack");
    else if (recent.includes("ability")) pulse("ability");
    else if (recent.includes("hit")) pulse("hit");
    else if (recent.includes("shielded")) pulse("shield");
    function pulse(kind: string) {
      setFlash(kind);
      setTimeout(() => setFlash(null), 220);
    }
  }, [unit.visualEvents.length, unit.visualEvents]);

  const ring = rarityRing[unit.rarity];
  const glow = rarityGlowColor[unit.rarity];
  const gradient = tokenGradient(unit.cardId);
  const label = card ? cardInitials(unit.cardId, card.name) : minion?.label ?? "??";
  const ownerGlow = isPlayer ? "0 0 14px rgba(120,220,140,0.55)" : "0 0 14px rgba(255,80,90,0.55)";

  const stunned = unit.statuses.some((s) => s.type === "stun" && s.remaining > 0);
  const slowed = unit.statuses.some((s) => s.type === "slow" && s.remaining > 0);

  const r = size / 2;
  const circumference = 2 * Math.PI * (r - 2);

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, zIndex: Math.round(100 - y) + 10 }}
      initial={{ opacity: 0, scale: 0.5, y: -22 }}
      animate={
        dying
          ? { opacity: 0, scale: 1.4, filter: "brightness(2)" }
          : { opacity: 1, scale: flash === "attack" ? 1.12 : 1, x: flash === "hit" ? [0, -3, 3, 0] : 0 }
      }
      transition={{
        left: { type: "tween", ease: "linear", duration: 0.1 },
        top: { type: "tween", ease: "linear", duration: 0.1 },
        scale: { duration: 0.18 },
        opacity: { duration: dying ? 0.3 : 0.25 },
        x: { duration: 0.18 },
      }}
    >
      {/* shadow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{ bottom: -4, width: size * 0.7, height: size * 0.22, background: "rgba(0,0,0,0.45)", filter: "blur(3px)" }}
      />

      {/* idle bob wrapper */}
      <motion.div
        className="relative h-full w-full"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 1.6 + (unit.bornAt % 7) * 0.1, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* HP / shield ring */}
        <svg className="absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={r} cy={r} r={r - 2} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={3} />
          {shieldFrac > 0 && (
            <circle
              cx={r} cy={r} r={r - 2} fill="none" stroke="#5cc8ff" strokeWidth={3}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - shieldFrac)}
              transform={`rotate(-90 ${r} ${r})`}
              opacity={0.9}
            />
          )}
          <motion.circle
            cx={r} cy={r} r={r - 2} fill="none"
            stroke={hpFrac > 0.4 ? (isPlayer ? "#b6ff1b" : "#ff5a5a") : "#ff7a3a"}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference * (1 - hpFrac) }}
            transition={{ duration: 0.25 }}
            transform={`rotate(-90 ${r} ${r})`}
          />
        </svg>

        {/* avatar */}
        <div
          className="absolute inset-[3px] flex items-center justify-center overflow-hidden rounded-full"
          style={{
            background: minion ? `linear-gradient(150deg, hsl(${minion.hue} 70% 45%), hsl(${minion.hue} 60% 20%))` : gradient,
            boxShadow: `inset 0 0 0 2px ${ring}, ${ownerGlow}${flash ? ", 0 0 16px 4px " + glow : ""}`,
            filter: stunned ? "saturate(0.4) brightness(0.8)" : slowed ? "saturate(0.7)" : "none",
          }}
        >
          {card?.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image_path}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : null}
          <span
            className="absolute font-display font-bold text-white/90"
            style={{ fontSize: size * 0.32, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}
          >
            {label}
          </span>
        </div>

        {/* role glyph */}
        <span
          className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-black/70 text-white"
          style={{ width: size * 0.34, height: size * 0.34, fontSize: size * 0.2, boxShadow: `0 0 0 1px ${ring}` }}
        >
          {roleGlyph[unit.role]}
        </span>

        {/* level badge */}
        {card && unit.level > 1 && (
          <span
            className="absolute -left-1 -top-1 grid place-items-center rounded-full bg-gold font-bold text-black"
            style={{ width: size * 0.3, height: size * 0.3, fontSize: size * 0.18 }}
          >
            {unit.level}
          </span>
        )}

        {/* status pips */}
        {(stunned || slowed) && (
          <div className="absolute -top-2 left-1/2 flex -translate-x-1/2 gap-0.5">
            {stunned && <span className="size-1.5 rounded-full bg-yellow-300 shadow-[0_0_6px_#fde047]" />}
            {slowed && <span className="size-1.5 rounded-full bg-sky-300 shadow-[0_0_6px_#7dd3fc]" />}
          </div>
        )}

        {/* ability flash overlay */}
        {flash === "ability" && (
          <motion.div
            className="absolute inset-[-6px] rounded-full"
            initial={{ opacity: 0.8, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 0.4 }}
            style={{ border: `2px solid ${ring}` }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

export const ArenaUnitToken = memo(ArenaUnitTokenInner, (a, b) =>
  a.x === b.x &&
  a.y === b.y &&
  a.size === b.size &&
  a.unit.hp === b.unit.hp &&
  a.unit.shield === b.unit.shield &&
  a.unit.visualEvents.length === b.unit.visualEvents.length &&
  a.unit.statuses.length === b.unit.statuses.length,
);
