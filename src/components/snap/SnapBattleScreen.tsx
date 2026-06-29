"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useSnapStore } from "@/store/snapStore";
import { useSnapLaunch } from "@/store/snapLaunchStore";
import { useMounted } from "@/hooks/useMounted";
import { submitSnapResult } from "@/lib/api/snap";
import { Layers } from "lucide-react";
import posthog from "posthog-js";

import { BattleShell } from "./ui/BattleShell";
import { SnapGameBoard } from "./ui/SnapGameBoard";
import { SnapHand } from "./ui/SnapHand";
import { SnapBossHeader } from "./ui/SnapBossHeader";
import { SnapPlayerHud } from "./ui/SnapPlayerHud";
import { SnapEnergyOrb } from "./ui/SnapEnergyOrb";
import { SnapEndTurnButton } from "./ui/SnapEndTurnButton";
import { SnapRetreatButton } from "./ui/SnapRetreatButton";
import { SnapMatchLogDrawer } from "./ui/SnapMatchLogDrawer";
import { SnapResultModal } from "./ui/SnapResultModal";

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
      profileId: profile.id,
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
      <SnapMatchLogDrawer log={match.eventLog} />

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

            {/* center: energy orb */}
            <div className="flex flex-col items-center gap-2">
              <SnapEnergyOrb energy={match.energy} energyLeft={eLeft} />
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

      <SnapResultModal
        open={complete && !!outcome}
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
