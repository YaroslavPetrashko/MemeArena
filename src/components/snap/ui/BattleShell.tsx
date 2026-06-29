"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import "@/styles/snap-battle.css";

const EMBER_COLORS = [
  "rgba(182, 255, 27, 0.8)",
  "rgba(255, 43, 214, 0.75)",
  "rgba(120, 200, 255, 0.7)",
  "rgba(255, 210, 74, 0.7)",
];

interface Ember {
  id: number;
  left: string;
  color: string;
  dur: string;
  delay: string;
  x: string;
  opacity: string;
  size: number;
}

/** Build a randomized ember field. Impure, so kept out of render (call in effect). */
function buildEmbers(count: number): Ember[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: EMBER_COLORS[i % EMBER_COLORS.length],
    dur: `${5 + Math.random() * 6}s`,
    delay: `${Math.random() * 8}s`,
    x: `${(Math.random() - 0.5) * 40}px`,
    opacity: `${0.3 + Math.random() * 0.4}`,
    size: 2 + Math.round(Math.random() * 2),
  }));
}

/**
 * Procedural drifting embers behind the board. Generated once on the client
 * after mount (random values are impure, so they stay out of render and SSR).
 */
function Embers({ count = 26 }: { count?: number }) {
  const [embers, setEmbers] = useState<Ember[]>([]);
  useEffect(() => {
    // Intentional: client-only decorative field, generated once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmbers(buildEmbers(count));
  }, [count]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {embers.map((e) => (
        <span
          key={e.id}
          className="battle-ember"
          style={
            {
              left: e.left,
              width: e.size,
              height: e.size,
              "--ember-color": e.color,
              "--ember-dur": e.dur,
              "--ember-delay": e.delay,
              "--ember-x": e.x,
              "--ember-opacity": e.opacity,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * Fullscreen, cinematic container for the battle. Renders the meme-arena
 * environment (nebula, floor glow, embers, vignette) behind a centered board
 * frame. The sidebar/chrome is already hidden for /battle in AppShell.
 */
export function BattleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden">
      {/* Environment layers */}
      <div className="battle-scene">
        <div className="battle-floor-glow" />
        <Embers />
      </div>
      <div className="battle-vignette" />

      {/* Compact top-left back button (no full sidebar in battle). */}
      <div className="absolute left-3 top-3 z-30 sm:left-5 sm:top-5">
        <Link
          href="/play"
          className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:border-lime/40 hover:text-white"
        >
          <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">Leave Arena</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </div>

      {/* Centered cinematic board frame. Fixed to the viewport height so the
          whole match fits without vertical scrolling. */}
      <div className="relative z-10 mx-auto flex h-[100svh] w-full max-w-[1120px] flex-col overflow-hidden px-2 pb-3 pt-12 sm:px-4">
        {children}
      </div>
    </div>
  );
}
