"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { ArenaHazard } from "@/types/arena";
import { hazardThemeColor } from "./arenaVisuals";

/**
 * Lane hazard / danger zone. Telegraphs with a pulsing warning band, then
 * shows the active damaging strip. `laneX` / `laneW` and the position→y mapper
 * are supplied by the board so the zone aligns to the lane geometry.
 */
function ArenaHazardZoneInner({
  hz,
  laneX,
  laneW,
  yForPos,
}: {
  hz: ArenaHazard;
  laneX: number;
  laneW: number;
  yForPos: (pos: number) => number;
}) {
  const c = hazardThemeColor[hz.theme];
  const warning = hz.warning > 0;
  const yTop = yForPos(hz.endPosition);
  const yBot = yForPos(hz.startPosition);
  const top = Math.min(yTop, yBot);
  const height = Math.abs(yBot - yTop);
  const isPlayer = hz.owner === "player";

  return (
    <div
      className="pointer-events-none absolute overflow-hidden rounded-xl"
      style={{ left: `${laneX}%`, width: `${laneW}%`, top: `${top}%`, height: `${height}%`, zIndex: 5 }}
    >
      {warning ? (
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{ opacity: [0.25, 0.6, 0.25] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{
            background: `repeating-linear-gradient(45deg, ${c.core}, ${c.core} 10px, transparent 10px, transparent 20px)`,
            border: `2px dashed ${c.edge}`,
            boxShadow: `inset 0 0 24px ${c.core}`,
          }}
        />
      ) : (
        <motion.div
          className="absolute inset-0 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.85, 0.5, 0.7] }}
          transition={{ duration: 0.25, repeat: Infinity }}
          style={{
            background: `linear-gradient(${isPlayer ? "0deg" : "180deg"}, ${c.edge}, ${c.core})`,
            boxShadow: `0 0 30px ${c.edge}, inset 0 0 30px ${c.core}`,
            border: `1px solid ${c.edge}`,
          }}
        />
      )}
    </div>
  );
}

export const ArenaHazardZone = memo(ArenaHazardZoneInner);
