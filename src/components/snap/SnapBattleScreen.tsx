"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useGameStore } from "@/store/gameStore";
import { useSnapStore } from "@/store/snapStore";
import { useSnapLaunch } from "@/store/snapLaunchStore";
import { useMounted } from "@/hooks/useMounted";
import { submitSnapResult } from "@/lib/api/snap";
import { SNAP_ACTIVE_EVENT } from "@/data/snapModes";
import { SnapBoard } from "./SnapBoard";
import { SnapHand } from "./SnapHand";
import { SnapTurnHeader } from "./SnapTurnHeader";
import { SnapBossPanel } from "./SnapBossPanel";
import { SnapMatchLog } from "./SnapMatchLog";
import { SnapEndTurnButton } from "./SnapEndTurnButton";
import { SnapScoreSummary } from "./SnapScoreSummary";
import { SnapRewardModal } from "./SnapRewardModal";

export function SnapBattleScreen() {
  const mounted = useMounted();
  const router = useRouter();
  const save = useGameStore((s) => s.save);
  const applySnapOutcome = useGameStore((s) => s.applySnapOutcome);

  const launch = useSnapLaunch((s) => s.config);
  const {
    match, phase, selectedInstanceId, invalidLocationId, outcomeApplied, outcome,
    start, select, place, unstage, endTurn, energyLeft, setOutcome, reset,
  } = useSnapStore();

  const startedRef = useRef(false);

  // Start the match once, from the launch config.
  useEffect(() => {
    if (!mounted || startedRef.current) return;
    if (!launch) {
      router.replace("/play");
      return;
    }
    startedRef.current = true;
    start({
      matchId: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      mode: launch.mode,
      bossId: launch.bossId,
      seed: `${launch.bossId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      deck: launch.deck,
      profileId: save.profile.id,
      survivalWave: launch.survivalWave,
      isEvent: launch.isEvent,
    });
  }, [mounted, launch, start, router, save.profile.id]);

  // On completion: apply rewards once + submit to server. setOutcome writes to
  // the zustand store (external system), not React state — safe inside effect.
  useEffect(() => {
    if (!match || match.status !== "complete" || outcomeApplied || !launch) return;
    const res = applySnapOutcome(match, { entryType: launch.entryType });
    setOutcome(res);
    void submitSnapResult(match, { entryType: launch.entryType, score: match.scoring?.total ?? 0 });
  }, [match, outcomeApplied, applySnapOutcome, setOutcome, launch]);

  if (!mounted || !match) {
    return (
      <div className="grid place-items-center min-h-[60vh] text-muted">
        <div className="animate-pulse">Shuffling the deck…</div>
      </div>
    );
  }

  const complete = match.status === "complete";
  const revealing = phase === "revealing";
  const selectable = !complete && !revealing && !!selectedInstanceId;
  const eLeft = energyLeft();

  function playAgain() {
    reset();
    startedRef.current = false;
    router.replace("/play");
  }

  return (
    <div className="relative max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-[1fr_240px] gap-3">
        {/* Main column */}
        <div className="space-y-3">
          {/* Top bar: boss + turn/energy */}
          <Panel className="p-3 flex items-center justify-between gap-3">
            <SnapBossPanel match={match} />
            <SnapTurnHeader turn={match.turn} maxTurns={match.maxTurns} energy={match.energy} energyLeft={eLeft} />
          </Panel>

          {complete && (
            <Panel className="p-3">
              <SnapScoreSummary match={match} />
            </Panel>
          )}

          {/* Board */}
          <SnapBoard
            match={match}
            selectable={selectable}
            invalidLocationId={invalidLocationId}
            onPlace={place}
            onUnstage={unstage}
          />

          {/* Hand */}
          {!complete && (
            <Panel className="p-2">
              <SnapHand
                match={match}
                selectedInstanceId={selectedInstanceId}
                energyLeft={eLeft}
                onSelect={(id) => select(selectedInstanceId === id ? null : id)}
              />
              {selectedInstanceId && (
                <p className="text-center text-[11px] text-lime pb-1">
                  Tap a location to place your card.
                </p>
              )}
            </Panel>
          )}

          {/* Controls */}
          {!complete && (
            <SnapEndTurnButton
              revealing={revealing}
              stagedCount={match.stagedPlays.length}
              onEndTurn={endTurn}
            />
          )}

          {complete && (
            <Button variant="ghost" className="w-full" onClick={playAgain}>
              Back to modes
            </Button>
          )}
        </div>

        {/* Side: match log */}
        <Panel className="p-3 hidden lg:flex flex-col h-[560px]">
          <div className="text-xs uppercase tracking-wide text-muted mb-2">Match Log</div>
          <SnapMatchLog log={match.eventLog} />
        </Panel>
      </div>

      <SnapRewardModal
        open={complete && !!outcome}
        match={match}
        reward={outcome?.reward ?? null}
        tokenReason={outcome?.tokenReason ?? ""}
        onPlayAgain={playAgain}
        onExit={() => { reset(); router.replace("/"); }}
      />

      {launch?.isEvent && !complete && (
        <p className="text-center text-[11px] text-magenta mt-2">
          🔥 {SNAP_ACTIVE_EVENT.name}: Brainrot cards have +{SNAP_ACTIVE_EVENT.brainrotPowerBonus} Power.
        </p>
      )}
    </div>
  );
}
