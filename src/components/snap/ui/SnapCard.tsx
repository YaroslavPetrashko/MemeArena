"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { SnapCard as SnapCardType } from "@/types/snap";
import { snapInitials } from "../snapVisuals";
import { SnapCardBack, type SnapCardSize } from "./SnapCardBack";
import { cardFlip } from "./snapMotion";

/** Box sizes per card size; `art` is the placeholder-initials font size. */
const SIZES: Record<SnapCardSize, { box: string; art: number }> = {
  xs: { box: "w-[52px] h-[72px]", art: 14 },
  sm: { box: "w-[64px] h-[88px]", art: 18 },
  md: { box: "w-[92px] h-[128px]", art: 24 },
  lg: { box: "w-[116px] h-[162px]", art: 32 },
};

export interface SnapCardProps {
  card: SnapCardType;
  size?: SnapCardSize;
  /** Render the card back instead of the face. */
  faceDown?: boolean;
  /** Hand context: selected card lifts + ring. */
  selected?: boolean;
  /** Affordable / playable glow. */
  playable?: boolean;
  /** Unaffordable / inactive dim. */
  dimmed?: boolean;
  /** Staged-this-turn pulse. */
  staged?: boolean;
  /** Enable 3D hover tilt (hand cards). */
  interactive?: boolean;
  /** Shake feedback (invalid action). */
  shake?: boolean;
  /** @deprecated power is baked into the card art; this is now ignored. */
  highlightPower?: boolean;
  /** @deprecated ability/name text is baked into the card art; now ignored. */
  showAbility?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SnapCard({
  card,
  size = "md",
  faceDown,
  selected,
  playable,
  dimmed,
  staged,
  interactive,
  shake,
  onClick,
  className,
}: SnapCardProps) {
  const [loaded, setLoaded] = useState(false);
  const s = SIZES[size];

  if (faceDown) {
    return <SnapCardBack size={size} className={className} />;
  }

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      variants={cardFlip}
      initial="hidden"
      animate="shown"
      whileHover={interactive ? { y: -10, rotateX: 6, scale: 1.05 } : onClick ? { y: -4 } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      style={{ transformPerspective: 600 }}
      className={cn(
        // No frame / background: the PNG art (which already bakes in the card
        // shape + power/cost) is shown in full via object-contain on a
        // transparent box. Selection/affordance feedback is expressed as a
        // drop-shadow glow that hugs the art's alpha outline.
        "group relative shrink-0 bg-transparent text-left",
        s.box,
        onClick && "cursor-pointer",
        playable && !selected && "snap-art-playable",
        selected && "z-20 -translate-y-2 snap-art-selected",
        staged && "snap-art-staged",
        dimmed && "opacity-45 saturate-50",
        shake && "snap-card-shake",
        className,
      )}
    >
      {/* Placeholder shown only until the art loads (initials, no card frame). */}
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center">
          <span
            className="font-display font-black text-white/40 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
            style={{ fontSize: s.art }}
          >
            {snapInitials(card.name)}
          </span>
        </div>
      )}

      {/* Full card art, original shape, no cropping. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // If the image is already cached/complete when it mounts, `onLoad` may
        // never fire — so check `complete` in the ref callback too.
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0) setLoaded(true);
        }}
        src={card.imagePath}
        alt={card.name}
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-contain transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />

      {/* level badge (upgrade level isn't baked into the art) */}
      {card.level > 1 && !card.isToken && (
        <div className="absolute bottom-0 right-0 z-10 rounded bg-black/70 px-1 text-[8px] font-bold text-gold ring-1 ring-gold/40">
          L{card.level}
        </div>
      )}
    </motion.button>
  );
}
