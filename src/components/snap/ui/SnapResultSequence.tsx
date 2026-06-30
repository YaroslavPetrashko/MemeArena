"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Skull, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SnapMatchState } from "@/types/snap";
import { useSnapSound } from "./useSnapSound";

/**
 * SnapResultSequence — the cinematic, location-by-location tally that plays the
 * moment a match completes, BEFORE the reward modal. It's purely presentational:
 * it reads `match.scoring` (already authoritative) and dramatizes how the result
 * was reached, then calls `onComplete` so the parent can open SnapResultModal.
 *
 * Flow (a small timed state machine):
 *   intro → loc[0] → loc[1] → loc[2] → verdict → (onComplete)
 *
 * For each location the two power numbers count up + scale in, the larger one
 * slams + bursts and "wins the point", a captured pip flies to that player's
 * running tally, and the loser recedes. The match is decided by locations won
 * (take 2 of 3 to win) — total power is irrelevant — so after all three the
 * final VERDICT lands with a shockwave and an "X – Y locations" line. Skippable.
 */

type Stage =
  | { kind: "intro" }
  | { kind: "location"; index: number }
  | { kind: "verdict" }
  | { kind: "done" };

/** Per-location beat timing (ms). Tuned to feel deliberate but not draggy. */
const COUNT_MS = 800; // power numbers counting up
const DECIDE_MS = 850; // pause on the winner burst before the point flies
const HANDOFF_MS = 950; // decided state lingers (point flies to tally), then advance
const INTRO_MS = 1000;
const VERDICT_MS = 2000;
const TIEBREAK_MS = 2600; // total-power duel before the verdict word lands (ties only)

/** Animate a number from 0 → target over `ms`, easing out. */
function useCountUp(target: number, run: boolean, ms = COUNT_MS): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!run) {
      // Reset when the count-up is disabled. Intentional sync reset on input change.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(0);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, run, ms]);
  return run ? value : 0;
}

interface Props {
  open: boolean;
  match: SnapMatchState;
  onComplete: () => void;
}

export function SnapResultSequence({ open, match, onComplete }: Props) {
  const sound = useSnapSound();
  const s = match.scoring;
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  // Cumulative locations decided so far (drives the running side tallies).
  const [tally, setTally] = useState({ player: 0, boss: 0 });
  const [shake, setShake] = useState(false);

  const locations = useMemo(
    () =>
      (s?.locations ?? []).map((loc) => ({
        ...loc,
        name: match.locations.find((l) => l.id === loc.locationId)?.name ?? "Location",
        art: match.locations.find((l) => l.id === loc.locationId)?.theme.imagePath,
        color: match.locations.find((l) => l.id === loc.locationId)?.theme.color ?? "#8b5cf6",
      })),
    [s, match.locations],
  );

  // Reset when (re)opened so a fresh match always starts from the top.
  const startedRef = useRef(false);
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      setStage({ kind: "intro" });
      setTally({ player: 0, boss: 0 });
    }
    if (!open) startedRef.current = false;
  }, [open]);

  // The timed state machine. Each stage schedules the next; cleanup clears
  // pending timers so a skip/unmount never fires a stale advance.
  useEffect(() => {
    if (!open || !s) return;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;

    if (stage.kind === "intro") {
      t1 = setTimeout(() => setStage({ kind: "location", index: 0 }), INTRO_MS);
    } else if (stage.kind === "location") {
      const loc = locations[stage.index];
      // After the count-up, register the decision: sound + burst + tally + shake.
      t1 = setTimeout(() => {
        sound.play("powerChange");
        setShake(true);
        setTimeout(() => setShake(false), 420);
        setTally((prev) =>
          loc.winner === "player"
            ? { ...prev, player: prev.player + 1 }
            : loc.winner === "boss"
              ? { ...prev, boss: prev.boss + 1 }
              : prev,
        );
      }, COUNT_MS + DECIDE_MS);
      // Then advance to the next location (or to the verdict after the last).
      t2 = setTimeout(
        () => {
          const next = stage.index + 1;
          setStage(next < locations.length ? { kind: "location", index: next } : { kind: "verdict" });
        },
        COUNT_MS + DECIDE_MS + HANDOFF_MS,
      );
    } else if (stage.kind === "verdict") {
      const tiebreaker = s.locationsWon === s.locationsLost;
      // On a tiebreaker we first play the total-power duel, then resolve; play
      // the win/loss sting only once the wordmark actually lands.
      const delay = tiebreaker ? TIEBREAK_MS + VERDICT_MS : VERDICT_MS;
      t2 = setTimeout(() => sound.play(s.result === "win" ? "win" : "loss"), tiebreaker ? TIEBREAK_MS : 0);
      t1 = setTimeout(() => setStage({ kind: "done" }), delay);
    } else if (stage.kind === "done") {
      t1 = setTimeout(onComplete, 80);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, open, s]);

  if (!open || !s) return null;

  const skip = () => setStage({ kind: "done" });

  return (
    <AnimatePresence>
      <motion.div
        key="result-seq"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-black/85 backdrop-blur-md"
        onClick={skip}
      >
        {/* Ambient backdrop glow that tints toward the leading side. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          animate={{
            background:
              stage.kind === "verdict"
                ? s.result === "win"
                  ? "radial-gradient(60% 60% at 50% 45%, rgba(182,255,27,0.18), transparent 70%)"
                  : s.result === "draw"
                    ? "radial-gradient(60% 60% at 50% 45%, rgba(160,130,255,0.16), transparent 70%)"
                    : "radial-gradient(60% 60% at 50% 45%, rgba(255,60,90,0.16), transparent 70%)"
                : "radial-gradient(60% 60% at 50% 45%, rgba(120,90,255,0.08), transparent 70%)",
          }}
          transition={{ duration: 0.6 }}
        />

        {/* Running side tallies — always visible across the whole sequence. */}
        <SideTallies player={tally.player} boss={tally.boss} dim={stage.kind === "intro"} />

        <div className={cn("relative w-full max-w-xl px-5", shake && "snap-stage-shake")}>
          <AnimatePresence mode="wait">
            {stage.kind === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="text-center"
              >
                <div className="font-display text-sm font-bold uppercase tracking-[0.4em] text-white/50">
                  Judging the board
                </div>
                <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </motion.div>
            )}

            {stage.kind === "location" && (
              <LocationBeat
                key={`loc-${stage.index}`}
                loc={locations[stage.index]}
                index={stage.index}
                total={locations.length}
              />
            )}

            {(stage.kind === "verdict" || stage.kind === "done") && (
              <VerdictBeat
                key="verdict"
                result={s.result}
                won={s.locationsWon}
                lost={s.locationsLost}
                tiebreaker={s.locationsWon === s.locationsLost}
                playerTotal={s.playerTotalPower}
                bossTotal={s.bossTotalPower}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Skip hint */}
        {stage.kind !== "done" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              skip();
            }}
            className="absolute bottom-6 right-6 rounded-full border border-white/15 bg-black/40 px-4 py-1.5 text-xs font-medium text-white/55 backdrop-blur transition-colors hover:border-white/30 hover:text-white/90"
          >
            Skip ▸
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- */
/* Per-location beat: name, art chip, dueling power numbers, decision */
/* ---------------------------------------------------------------- */

function LocationBeat({
  loc,
  index,
  total,
}: {
  loc: {
    locationId: string;
    name: string;
    art?: string;
    color: string;
    playerPower: number;
    bossPower: number;
    winner: "player" | "boss" | "tie";
  };
  index: number;
  total: number;
}) {
  // Decision lands after the count-up finishes.
  const [decided, setDecided] = useState(false);
  const playerVal = useCountUp(loc.playerPower, true);
  const bossVal = useCountUp(loc.bossPower, true);

  useEffect(() => {
    // Re-arm the decision when this beat mounts for a fresh location.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecided(false);
    const t = setTimeout(() => setDecided(true), COUNT_MS + 40);
    return () => clearTimeout(t);
  }, [loc.locationId]);

  const playerWon = loc.winner === "player";
  const bossWon = loc.winner === "boss";
  const tie = loc.winner === "tie";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="text-center"
    >
      {/* Location step indicator */}
      <div className="mb-4 flex items-center justify-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-white/80" : i < index ? "w-1.5 bg-white/45" : "w-1.5 bg-white/15",
            )}
          />
        ))}
      </div>

      {/* Location card with art + name and a light sweep on entry. */}
      <div
        className="relative mx-auto mb-6 w-full max-w-sm overflow-hidden rounded-2xl ring-1 ring-white/12"
        style={{ boxShadow: `0 0 32px -8px ${loc.color}` }}
      >
        <div className="relative h-20 w-full">
          {loc.art ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={loc.art} alt={loc.name} className="absolute inset-0 size-full object-cover" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${loc.color}55, transparent)` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />
          <div className="snap-tally-sweep pointer-events-none absolute inset-y-0 w-1/3 bg-white/25" />
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-xl font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {loc.name}
            </span>
          </div>
        </div>
      </div>

      {/* Dueling power numbers */}
      <div className="relative flex items-stretch justify-center gap-4">
        <PowerSide
          label="You"
          value={playerVal}
          tone="player"
          won={decided && playerWon}
          lost={decided && bossWon}
          tie={decided && tie}
        />
        <div className="flex flex-col items-center justify-center">
          <span className="font-display text-lg font-black text-white/30">VS</span>
        </div>
        <PowerSide
          label="Foe"
          value={bossVal}
          tone="boss"
          won={decided && bossWon}
          lost={decided && playerWon}
          tie={decided && tie}
        />

        {/* Captured point flies from the winning side up to its running tally.
            Mounted only after the decision lands so the keyframe runs once. */}
        {decided && playerWon && <FlyingPoint tone="player" />}
        {decided && bossWon && <FlyingPoint tone="boss" />}
      </div>

      {/* Decision verdict line */}
      <AnimatePresence>
        {decided && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: DECIDE_MS / 1000 - 0.1 }}
            className={cn(
              "mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-display text-sm font-black uppercase tracking-wide",
              playerWon && "bg-lime/15 text-lime ring-1 ring-lime/40",
              bossWon && "bg-red-500/15 text-red-300 ring-1 ring-red-400/40",
              tie && "bg-violet-400/15 text-violet-200 ring-1 ring-violet-300/40",
            )}
          >
            {playerWon && (
              <>
                <Crown className="size-4" /> You take {loc.name}
              </>
            )}
            {bossWon && (
              <>
                <Skull className="size-4" /> Foe takes {loc.name}
              </>
            )}
            {tie && (
              <>
                <Minus className="size-4" /> {loc.name} is contested
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** A glowing point token that flies from the winning number to its tally. */
function FlyingPoint({ tone }: { tone: "player" | "boss" }) {
  // Player tally sits top-left, boss top-right; fly up and toward that edge.
  const flyX = tone === "player" ? "-38vw" : "38vw";
  return (
    <span
      aria-hidden
      className={cn(
        "snap-point-fly pointer-events-none absolute top-1/2 z-10 grid size-9 snap-tally-diamond place-items-center ring-2",
        tone === "player"
          ? "left-3 bg-lime text-black ring-lime/70 shadow-[0_0_18px_rgba(182,255,27,0.7)]"
          : "right-3 bg-red-500 text-white ring-red-300/70 shadow-[0_0_18px_rgba(255,60,90,0.65)]",
      )}
      style={{ "--fly-x": flyX, "--fly-y": "-34vh" } as React.CSSProperties}
    />
  );
}

function PowerSide({
  label,
  value,
  tone,
  won,
  lost,
  tie,
}: {
  label: string;
  value: number;
  tone: "player" | "boss";
  won: boolean;
  lost: boolean;
  tie: boolean;
}) {
  const accent = tone === "player" ? "rgba(182,255,27" : "rgba(255,60,90";
  return (
    <div className="relative flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "text-[11px] font-bold uppercase tracking-[0.2em]",
          tone === "player" ? "text-lime/80" : "text-red-300/80",
        )}
      >
        {label}
      </span>
      <div className="relative">
        {/* Winner burst ring */}
        {won && (
          <span
            className="snap-tally-burst pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 3px ${accent},0.7), 0 0 30px ${accent},0.5)` }}
          />
        )}
        <div
          className={cn(
            "grid h-[88px] w-[88px] snap-tally-diamond place-items-center font-display text-4xl font-black tabular-nums ring-2 transition-colors",
            won && "snap-tally-slam",
            lost && "snap-tally-fade",
            won
              ? tone === "player"
                ? "bg-gradient-to-br from-lime to-lime-deep text-black ring-lime/70"
                : "bg-gradient-to-br from-red-400 to-red-700 text-white ring-red-300/70"
              : tie
                ? "bg-violet-500/25 text-violet-100 ring-violet-300/40"
                : "bg-white/[0.06] text-white/85 ring-white/15",
          )}
          style={
            won
              ? { boxShadow: `0 0 28px -2px ${accent},0.6)` }
              : undefined
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Verdict beat: full-screen VICTORY / DEFEAT / DRAW with shockwave    */
/* ---------------------------------------------------------------- */

function VerdictBeat({
  result,
  won,
  lost,
  tiebreaker,
  playerTotal,
  bossTotal,
}: {
  result: "win" | "loss" | "draw";
  won: number;
  lost: number;
  /** Locations ended even (won === lost) — total power decided the match. */
  tiebreaker: boolean;
  playerTotal: number;
  bossTotal: number;
}) {
  // When a tiebreaker is in play, hold on the total-power duel first, then slam
  // the verdict word. Otherwise go straight to the verdict.
  const [phase, setPhase] = useState<"tiebreak" | "verdict">(tiebreaker ? "tiebreak" : "verdict");
  useEffect(() => {
    if (!tiebreaker) return;
    const t = setTimeout(() => setPhase("verdict"), TIEBREAK_MS);
    return () => clearTimeout(t);
  }, [tiebreaker]);

  if (phase === "tiebreak") {
    return <TiebreakBeat result={result} playerTotal={playerTotal} bossTotal={bossTotal} />;
  }

  const word = result === "win" ? "VICTORY" : result === "draw" ? "DRAW" : "DEFEAT";
  const color =
    result === "win" ? "text-lime" : result === "draw" ? "text-violet-300" : "text-red-400";
  const shockColor =
    result === "win"
      ? "rgba(182,255,27,0.45)"
      : result === "draw"
        ? "rgba(160,130,255,0.4)"
        : "rgba(255,60,90,0.4)";
  const glow =
    result === "win"
      ? "drop-shadow-[0_0_34px_rgba(182,255,27,0.7)]"
      : result === "draw"
        ? "drop-shadow-[0_0_26px_rgba(160,130,255,0.6)]"
        : "drop-shadow-[0_0_28px_rgba(255,60,90,0.6)]";

  return (
    <motion.div
      initial={tiebreaker ? { opacity: 0, scale: 0.94 } : false}
      animate={{ opacity: 1, scale: 1 }}
      className="relative grid place-items-center text-center"
    >
      {/* shockwave ring */}
      <span
        className="snap-verdict-shock pointer-events-none absolute size-32 rounded-full"
        style={{ boxShadow: `0 0 0 4px ${shockColor}` }}
      />
      <span
        className="snap-verdict-shock pointer-events-none absolute size-32 rounded-full"
        style={{ boxShadow: `0 0 0 2px ${shockColor}`, animationDelay: "0.12s" }}
      />
      {tiebreaker && (
        <div className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.35em] text-gold/90">
          Tiebreaker · Total Power
        </div>
      )}
      <div className={cn("snap-verdict-slam font-display text-7xl font-black tracking-tight sm:text-8xl", color, glow)}>
        {word}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-3 font-display text-sm font-bold uppercase tracking-[0.3em] text-white/70"
      >
        {tiebreaker ? (
          <>
            Locations <span className="text-white/90">{won}</span>–{lost} tied ·{" "}
            <span className={color}>
              {playerTotal}–{bossTotal}
            </span>{" "}
            power
          </>
        ) : (
          <>
            <span className={color}>{won}</span> – {lost} locations
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * Tiebreaker phase — shown when both sides won the same number of locations.
 * Reuses the location-duel language (count-up + slam + fade) on TOTAL board
 * power so the player understands the match was decided by the tiebreaker.
 */
function TiebreakBeat({
  result,
  playerTotal,
  bossTotal,
}: {
  result: "win" | "loss" | "draw";
  playerTotal: number;
  bossTotal: number;
}) {
  const [decided, setDecided] = useState(false);
  const p = useCountUp(playerTotal, true, COUNT_MS);
  const b = useCountUp(bossTotal, true, COUNT_MS);
  useEffect(() => {
    const t = setTimeout(() => setDecided(true), COUNT_MS + 60);
    return () => clearTimeout(t);
  }, []);

  const playerWins = result === "win";
  const bossWins = result === "loss";
  const drawn = result === "draw";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="text-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 1.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="mx-auto mb-1 inline-flex items-center gap-2 rounded-full bg-gold/15 px-5 py-1.5 font-display text-sm font-black uppercase tracking-[0.25em] text-gold ring-1 ring-gold/40"
      >
        Locations Tied
      </motion.div>
      <div className="mb-6 font-display text-xs font-bold uppercase tracking-[0.4em] text-white/55">
        Tiebreaker — Total Power
      </div>

      <div className="flex items-stretch justify-center gap-4">
        <PowerSide
          label="You"
          value={p}
          tone="player"
          won={decided && playerWins}
          lost={decided && bossWins}
          tie={decided && drawn}
        />
        <div className="flex flex-col items-center justify-center">
          <span className="font-display text-lg font-black text-white/30">VS</span>
        </div>
        <PowerSide
          label="Foe"
          value={b}
          tone="boss"
          won={decided && bossWins}
          lost={decided && playerWins}
          tie={decided && drawn}
        />
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- */
/* Persistent running tallies on the left (You) and right (Foe) edges */
/* ---------------------------------------------------------------- */

function SideTallies({ player, boss, dim }: { player: number; boss: number; dim: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-[18%] flex items-center justify-between px-6 transition-opacity duration-500 sm:px-12",
        dim ? "opacity-0" : "opacity-100",
      )}
    >
      <TallyColumn label="You" count={player} tone="player" />
      <TallyColumn label="Foe" count={boss} tone="boss" />
    </div>
  );
}

function TallyColumn({ label, count, tone }: { label: string; count: number; tone: "player" | "boss" }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={cn(
          "font-display text-xs font-black uppercase tracking-[0.25em]",
          tone === "player" ? "text-lime/70" : "text-red-300/70",
        )}
      >
        {label}
      </span>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => {
          const filled = i < count;
          return (
            <span
              key={i}
              className={cn(
                "grid size-7 snap-tally-diamond place-items-center ring-1 transition-colors",
                filled ? "snap-pip-land" : "",
                filled
                  ? tone === "player"
                    ? "bg-lime text-black ring-lime/60 shadow-[0_0_12px_rgba(182,255,27,0.5)]"
                    : "bg-red-500 text-white ring-red-300/60 shadow-[0_0_12px_rgba(255,60,90,0.45)]"
                  : "bg-white/[0.04] ring-white/12",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
