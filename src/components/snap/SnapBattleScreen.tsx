"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useSnapStore } from "@/store/snapStore";
import { useSnapLaunch } from "@/store/snapLaunchStore";
import { useMounted } from "@/hooks/useMounted";
import { submitSnapResult } from "@/lib/api/snap";
import { computeBotSkill } from "@/lib/game/snap/snapBossAI";
import { getSnapBoss, bossDifficultyValue } from "@/data/snapBosses";
import { rankForRp } from "@/data/ranks";
import { Layers, Clock } from "lucide-react";
import posthog from "posthog-js";
import { cn } from "@/lib/utils/cn";

/** Seconds a player gets to stage their turn before it auto-submits (anti-stall). */
const TURN_SECONDS = 45;

import { BattleShell } from "./ui/BattleShell";
import { SnapGameBoard } from "./ui/SnapGameBoard";
import { SnapHand } from "./ui/SnapHand";
import { SnapBossHeader } from "./ui/SnapBossHeader";
import { SnapPlayerHud } from "./ui/SnapPlayerHud";
import { SnapEnergyOrb } from "./ui/SnapEnergyOrb";
import { SnapEndTurnButton } from "./ui/SnapEndTurnButton";
import { SnapRetreatButton } from "./ui/SnapRetreatButton";
import { SnapMatchLogDrawer } from "./ui/SnapMatchLogDrawer";
import { SnapHelpButton } from "./ui/SnapHelpButton";
import { SnapResultModal } from "./ui/SnapResultModal";
import { SnapResultSequence } from "./ui/SnapResultSequence";

/**
 * The SNAP battle screen — a fullscreen cinematic card-battler scene.
 * Engine/state untouched: this file only composes the new UI around the
 * existing snapStore actions (start/select/place/unstage/endTurn) and the
 * gameStore outcome pipeline.
 */
export function SnapBattleScreen() {
  const mounted = useMounted();
  const router = useRouter();
  const profile = useGameStore((s) => s.save.profile);
  const applySnapOutcome = useGameStore((s) => s.applySnapOutcome);

  const launch = useSnapLaunch((s) => s.config);
  const {
    match, phase, selectedInstanceId, invalidLocationId, outcomeApplied, outcome,
    start, select, place, unstage, endTurn, energyLeft, setOutcome, reset,
  } = useSnapStore();

  const startedRef = useRef(false);
  // The cinematic location-by-location tally plays first; only when it finishes
  // (or is skipped) do we hand off to the reward modal — same data, same flow.
  const [sequenceDone, setSequenceDone] = useState(false);
  // Let the final board state breathe: hold the revealed board for a beat after
  // the last turn before the result overlay takes over.
  const [resultHoldDone, setResultHoldDone] = useState(false);

  // Start the match once, from the launch config.
  useEffect(() => {
    if (!mounted || startedRef.current) return;
    if (!launch) {
      router.replace("/play");
      return;
    }
    startedRef.current = true;
    // Adaptive difficulty: the bot's skill scales with the boss's difficulty and
    // the player's standing (rank tier + current win streak), read once at start
    // so a winning player faces a sharper opponent and a struggling one (who has
    // de-ranked) gets an easier match — keeping the challenge in the flow band.
    const save = useGameStore.getState().save;
    const bossDef = getSnapBoss(launch.bossId);
    const botSkill = bossDef
      ? computeBotSkill({
          difficultyValue: bossDifficultyValue(bossDef),
          rankTierIndex: rankForRp(save.profile.rankPoints).tierIndex,
          winStreak: save.stats.currentStreak,
        })
      : undefined;
    start({
      matchId: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      mode: launch.mode,
      bossId: launch.bossId,
      seed: `${launch.bossId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      deck: launch.deck,
      profileId: profile.id,
      botSkill,
    });
  }, [mounted, launch, start, router, profile.id]);

  // On completion: apply rewards once + submit to server.
  useEffect(() => {
    if (!match || match.status !== "complete" || outcomeApplied || !launch) return;
    const res = applySnapOutcome(match, { entryType: launch.entryType });
    setOutcome(res);
    void submitSnapResult(match, { entryType: launch.entryType, score: match.scoring?.total ?? 0 });
    posthog.capture("battle_completed", {
      mode: launch.mode,
      boss_id: launch.bossId,
      result: match.scoring?.result,
      player_total_power: match.scoring?.playerTotalPower,
      boss_total_power: match.scoring?.bossTotalPower,
      power_differential: match.scoring?.powerDifferential,
      locations_won: match.scoring?.locationsWon,
      locations_lost: match.scoring?.locationsLost,
      turns_played: match.turn,
      coins_earned: res.reward.coins,
      memearena_earned: res.reward.memearena,
      token_reason: res.tokenReason,
    });
  }, [match, outcomeApplied, applySnapOutcome, setOutcome, launch]);

  // Hold the final board for ~2s after the last turn resolves, so the player can
  // read the end state before the result tally overlay opens.
  useEffect(() => {
    if (!match || match.status !== "complete") {
      // Reset the hold while a match is in progress. Intentional sync reset.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResultHoldDone(false);
      return;
    }
    const t = setTimeout(() => setResultHoldDone(true), 2000);
    return () => clearTimeout(t);
  }, [match?.status]);

  // --- Per-turn move timer (auto-ends the turn so a match can't stall) ---
  // Held in state (tagged with its turn) so `secondsLeft` derives from state
  // only — no ref reads or Date.now() during render (React-compiler safe).
  const [timer, setTimer] = useState<{ turn: number; left: number }>({ turn: -1, left: TURN_SECONDS });
  const staging = !!match && match.status !== "complete" && phase === "staging";

  useEffect(() => {
    if (!staging || !match) return;
    const turn = match.turn;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimer({ turn, left: TURN_SECONDS });
    const id = setInterval(() => {
      setTimer((t) => (t.turn === turn ? { turn, left: Math.max(0, t.left - 1) } : t));
    }, 1000);
    return () => clearInterval(id);
  }, [staging, match?.turn]);

  // Only trust the timer once it's tagged for the CURRENT turn (avoids a stale
  // value auto-ending a freshly-started turn).
  const timerArmed = staging && !!match && timer.turn === match.turn;
  const secondsLeft = timerArmed ? timer.left : TURN_SECONDS;

  useEffect(() => {
    if (timerArmed && timer.left <= 0) endTurn();
  }, [timerArmed, timer.left, endTurn]);

  if (!mounted || !match) {
    return (
      <BattleShell>
        <div className="grid flex-1 place-items-center text-muted">
          <div className="animate-pulse font-display text-lg">Shuffling the deck…</div>
        </div>
      </BattleShell>
    );
  }

  const complete = match.status === "complete";
  const revealing = phase === "revealing";
  const selectable = !complete && !revealing && !!selectedInstanceId;
  const eLeft = energyLeft();

  function playAgain() {
    reset();
    startedRef.current = false;
    setSequenceDone(false);
    setResultHoldDone(false);
    router.replace("/play");
  }

  function retreat() {
    posthog.capture("battle_retreated", {
      mode: launch?.mode,
      boss_id: launch?.bossId,
      turn: match?.turn,
      player_total_power: match?.scoring?.playerTotalPower,
    });
    reset();
    startedRef.current = false;
    router.replace("/play");
  }

  return (
    <BattleShell>
      {/* Per-turn countdown bar across the very top of the scene. */}
      {staging && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-1.5">
          <div
            className="h-full rounded-r-full transition-[width] duration-200 ease-linear"
            style={{
              width: `${(secondsLeft / TURN_SECONDS) * 100}%`,
              background: secondsLeft <= 10 ? "#ef4444" : "#b6ff1b",
            }}
          />
        </div>
      )}

      <SnapMatchLogDrawer log={match.eventLog} />
      <SnapHelpButton />

      {/* Top: boss banner */}
      <SnapBossHeader match={match} />

      {/* Center: the three locations (the hero of the scene), vertically
          centered so there's symmetric room above (boss/north) and below
          (player/south) each location for placing cards. */}
      <div className="my-2 flex min-h-0 flex-1 flex-col justify-center">
        <SnapGameBoard
          match={match}
          selectable={selectable}
          invalidLocationId={invalidLocationId}
          onPlace={place}
          onUnstage={unstage}
          onStagedDrop={(id, fromLoc, toLoc) => {
            // Dropped back on its own lane → keep it. Off-board → return to hand.
            // A different revealed lane → move it there.
            if (toLoc === fromLoc) return;
            unstage(id);
            if (toLoc) place(toLoc, id);
          }}
        />

        {selectedInstanceId && !complete && (
          <p className="mt-2 text-center text-[11px] font-medium text-lime">
            ⤵ Drag a card onto a glowing location — or tap one to place.
          </p>
        )}

      </div>

      {/* Bottom: hand + control deck. */}
      {!complete && (
        <div className="mt-auto">
          <SnapHand
            match={match}
            selectedInstanceId={selectedInstanceId}
            energyLeft={eLeft}
            canPlay={!complete && !revealing}
            onSelect={(id) => select(selectedInstanceId === id ? null : id)}
            onArm={(id) => select(id)}
            onDropAt={(locationId, instanceId) => place(locationId, instanceId)}
          />

          <div className="mt-2 flex items-end justify-between gap-3 rounded-2xl bg-black/30 px-3 py-2.5 ring-1 ring-white/8 backdrop-blur-sm">
            {/* left: player + retreat */}
            <div className="flex flex-col gap-2">
              <SnapPlayerHud username={profile.username} walletAddress={profile.walletAddress} />
              <SnapRetreatButton onRetreat={retreat} disabled={revealing} />
            </div>

            {/* center: energy orb + move timer */}
            <div className="flex flex-col items-center gap-2">
              <SnapEnergyOrb energy={match.energy} energyLeft={eLeft} />
              <div
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ring-1 backdrop-blur",
                  secondsLeft <= 10
                    ? "animate-pulse bg-red-500/20 text-red-300 ring-red-500/40"
                    : "bg-black/55 text-white/80 ring-white/10",
                )}
              >
                <Clock className="size-3" /> {secondsLeft}s
              </div>
            </div>

            {/* right: end turn + deck remaining */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white/70 ring-1 ring-white/10 backdrop-blur">
                <Layers className="size-3 text-lime" />
                {match.player.deck.length} in deck
              </div>
              <SnapEndTurnButton
                turn={match.turn}
                maxTurns={match.maxTurns}
                revealing={revealing}
                stagedCount={match.stagedPlays.length}
                onEndTurn={endTurn}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cinematic tally: dramatizes the result location-by-location before the
          reward modal. Driven purely off the authoritative match.scoring. */}
      <SnapResultSequence
        open={complete && !!match.scoring && resultHoldDone && !sequenceDone}
        match={match}
        onComplete={() => setSequenceDone(true)}
      />

      <SnapResultModal
        open={complete && !!outcome && sequenceDone}
        match={match}
        reward={outcome?.reward ?? null}
        tokenReason={outcome?.tokenReason ?? ""}
        unlockedCardId={outcome?.unlockedCardId}
        rpDelta={outcome?.rpDelta}
        rank={outcome?.rank}
        rankUp={outcome?.rankUp}
        streak={outcome?.streak}
        onPlayAgain={playAgain}
        onExit={() => {
          reset();
          router.replace("/");
        }}
      />
    </BattleShell>
  );
}
