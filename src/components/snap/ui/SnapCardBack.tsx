"use client";

import { cn } from "@/lib/utils/cn";

const SIZES = {
  xs: "w-[52px] h-[72px]",
  sm: "w-[64px] h-[88px]",
  md: "w-[92px] h-[128px]",
  lg: "w-[116px] h-[162px]",
} as const;

export type SnapCardSize = keyof typeof SIZES;

/** MemeArena card back — neon monogram crown motif on dark premium glass. */
export function SnapCardBack({
  size = "md",
  className,
}: {
  size?: SnapCardSize;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[10px] snap-card-frame",
        "bg-[radial-gradient(120%_120%_at_50%_0%,#1a1330_0%,#0a0712_60%,#050308_100%)]",
        SIZES[size],
        className,
      )}
    >
      {/* neon frame */}
      <div className="absolute inset-[3px] rounded-[7px] ring-1 ring-inset ring-white/10" />
      <div className="absolute inset-[3px] rounded-[7px] ring-1 ring-inset ring-magenta/20" />
      {/* center monogram */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative grid size-9 place-items-center rounded-lg bg-gradient-to-br from-lime/25 to-magenta/25 ring-1 ring-white/15">
          <span className="font-display text-lg font-black text-white/80 drop-shadow">M</span>
          <span className="absolute -top-1.5 text-[10px]">👑</span>
        </div>
      </div>
      {/* radial glow + scanlines */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(182,255,27,0.12),transparent_60%)]" />
      <div className="absolute inset-0 snap-card-gloss opacity-40" />
    </div>
  );
}
