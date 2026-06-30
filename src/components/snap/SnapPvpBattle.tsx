"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Hourglass, Loader2 } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { usePvpStore } from "@/store/pvpStore";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

import { BattleShell } from "./ui/BattleShell";
import { SnapGameBoard } from "./ui/SnapGameBoard";
import { SnapHand } from "./ui/SnapHand";
import { SnapPlayerHud } from "./ui/SnapPlayerHud";
import { SnapEnergyOrb } from "./ui/SnapEnergyOrb";
import { SnapHelpButton } from "./ui/SnapHelpButton";

/** Seconds to stage a PvP turn before it auto-submits (anti-stall). */
const TURN_SECONDS = 45;

/**
 * PvP battle screen. The synced board comes from the server (authoritative);
 * the player stages locally and submits, then waits for the opponent. When both
 * submit, the server resolves and pushes the new board via Realtime.
 */
export function SnapPvpBattle() {
  const profile = useGameStore((s) => s.save.profile);
  const {
    match, mySide, phase, submitted, displayState, energyLeft, stage, unstage, submit, leave,
  } = usePvpStore();

  const [selected, setSelected] = useState<string | null>(null);
  const view = displayState();

  // Clear the local selection whenever a new turn/board arrives.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(null);
  }, [match?.current_turn, submitted]);

  // Per-turn timer: auto-submits my staged plays on expiry so I can't stall my
  // opponent. (A closed browser still needs a server-side timeout — follow-up.)
  const canActNow = phase === "playing" && !submitted && match?.status !== "complete";
  const [timer, setTimer] = useState<{ turn: number; left: number }>({ turn: -1, left: TURN_SECONDS });
  useEffect(() => {
    if (!canActNow || !match) return;
    const turn = match.current_turn;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimer({ turn, left: TURN_SECONDS });
    const id = setInterval(() => {
      setTimer((t) => (t.turn === turn ? { turn, left: Math.max(0, t.left - 1) } : t));
    }, 1000);
    return () => clearInterval(id);
  }, [canActNow, match?.current_turn]);
  const timerArmed = canActNow && !!match && timer.turn === match.current_turn;
  const secondsLeft = timerArmed ? timer.left : TURN_SECONDS;
  useEffect(() => {
    if (timerArmed && timer.left <= 0) void submit();
  }, [timerArmed, timer.left, submit]);

  if (!match || !view) {
    return (
      <BattleShell>
        <div className="grid flex-1 place-items-center text-muted">
          <div className="animate-pulse font-display text-lg">Connecting to match…</div>
        </div>
      </BattleShell>
    );
  }

  const complete = match.status === "complete";
  const canPlay = phase === "playing" && !submitted && !complete;
  const oppName = mySide === "player" ? match.username_b : match.username_a;
  const eLeft = energyLeft();

  function place(locationId: string, instanceId?: string) {
    const id = instanceId ?? selected;
    if (!id) return false;
    const ok = stage(id, locationId);
    if (ok) setSelected(null);
    return ok;
  }

  return (
    <BattleShell>
      <SnapHelpButton />

      {/* Per-turn countdown bar */}
      {canActNow && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-1.5">
          <div
            className="h-full rounded-r-full transition-[width] duration-200 ease-linear"
            style={{
              width: `${(secondsLeft / TURN_SECONDS) * 100}%`,
              background: secondsLeft <= 10 ? "#ef4444" : "#ff2bd6",
            }}
          />
        </div>
      )}

      {/* Opponent banner */}
      <div className="mb-1 flex items-center justify-center gap-2 text-sm text-white/80">
        <Swords className="size-4 text-magenta" />
        <span className="font-display font-bold">{oppName}</span>
        <span className="text-white/40">· Turn {match.current_turn}/{match.max_turns}</span>
      </div>

      <div className="my-2 flex min-h-0 flex-1 flex-col justify-center">
        <SnapGameBoard
          match={view}
          selectable={!!selected && canPlay}
          invalidLocationId={null}
          onPlace={(locId) => place(locId)}
          onUnstage={(id) => unstage(id)}
          onStagedDrop={(id, fromLoc, toLoc) => {
            if (toLoc === fromLoc) return;
            unstage(id);
            if (toLoc) stage(id, toLoc);
          }}
        />
        {selected && canPlay && (
          <p className="mt-2 text-center text-[11px] font-medium text-lime">
            ⤵ Drag onto a glowing location — or tap one to place.
          </p>
        )}
      </div>

      {!complete && (
        <div className="mt-auto">
          <SnapHand
            match={view}
            selectedInstanceId={selected}
            energyLeft={eLeft}
            canPlay={canPlay}
            onSelect={(id) => setSelected(selected === id ? null : id)}
            onArm={(id) => setSelected(id)}
            onDropAt={(locationId, instanceId) => place(locationId, instanceId)}
          />

          <div className="mt-2 flex items-end justify-between gap-3 rounded-2xl bg-black/30 px-3 py-2.5 ring-1 ring-white/8 backdrop-blur-sm">
            <div className="flex flex-col gap-2">
              <SnapPlayerHud username={profile.username} walletAddress={profile.walletAddress} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <SnapEnergyOrb energy={view.player.energy} energyLeft={eLeft} />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              {submitted ? (
                <div className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white/80 ring-1 ring-white/10">
                  <Hourglass className="size-3.5 animate-pulse text-magenta" /> Waiting for {oppName}…
                </div>
              ) : (
                <Button variant="magenta" onClick={() => void submit()}>
                  <Swords className="size-4" /> Submit Turn
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <PvpResultOverlay open={complete} view={view} result={match.result} iAmA={mySide === "player"} onExit={leave} />
    </BattleShell>
  );
}

function PvpResultOverlay({
  open,
  view,
  result,
  iAmA,
  onExit,
}: {
  open: boolean;
  view: ReturnType<typeof usePvpStore.getState>["synced"];
  result: "player_a" | "player_b" | "draw" | null;
  iAmA: boolean;
  onExit: () => void;
}) {
  const myResult =
    result === "draw" || !result ? "draw" : (result === "player_a") === iAmA ? "win" : "loss";
  const verdict = myResult === "win" ? "VICTORY" : myResult === "loss" ? "DEFEAT" : "DRAW";
  const color = myResult === "win" ? "text-lime" : myResult === "loss" ? "text-red-400" : "text-violet-300";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.85, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-3xl bg-[#0a0712]/95 p-6 text-center ring-1 ring-white/10"
          >
            <div className={cn("font-display text-5xl font-black tracking-tight", color)}>{verdict}</div>
            {view && (
              <div className="mt-4 flex justify-center gap-2">
                {view.locations.map((loc) => {
                  const won = loc.playerPower > loc.bossPower;
                  const lost = loc.bossPower > loc.playerPower;
                  return (
                    <span
                      key={loc.id}
                      className={cn(
                        "grid size-10 place-items-center rounded-lg font-display text-xs font-black",
                        won ? "bg-lime text-black" : lost ? "bg-red-500 text-white" : "bg-violet-400 text-black",
                      )}
                    >
                      {won ? "WON" : lost ? "LOST" : "TIE"}
                    </span>
                  );
                })}
              </div>
            )}
            <Button className="mt-6 w-full" onClick={onExit}>
              <Loader2 className="size-4" /> Back to matchmaking
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
