"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScrollText, Trophy, Skull, ArrowRight, Zap, Heart, Flame } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyChip } from "@/components/ui/CurrencyChip";
import { useArenaStore } from "@/store/arenaStore";
import { useGameStore, type BattleOutcomeResult } from "@/store/gameStore";
import { arenaToBattleState, computeArenaScore } from "@/lib/game/arenaScoring";
import { bossCoreShield } from "@/lib/game/arenaBossAI";
import { formatToken } from "@/lib/utils/format";
import type { Lane, ArenaBattleState } from "@/types/arena";

import { ArenaBoard } from "./ArenaBoard";
import { BossCore } from "./BossCore";
import { PlayerCore } from "./PlayerCore";
import { EnergyMeter } from "./EnergyMeter";
import { HypeMeter } from "./HypeMeter";
import { ArenaHand } from "./ArenaHand";
import { BossIntentBar } from "./BossIntentBar";
import { ComboCinematicBanner } from "./ComboCinematicBanner";

const TOKEN_REASON_TEXT: Record<string, string> = {
  ok: "",
  loss: "No token reward — your base fell.",
  guest_no_wallet: "Connect a wallet to earn claimable MEMEARENA.",
  below_min_wave: "Reach wave 5+ to earn MEMEARENA in Survival.",
  cap_reached: "Daily reward cap reached — come back tomorrow.",
  under_review: "Reward flagged for validation review.",
};

export function ArenaBattleScreen() {
  const router = useRouter();
  const state = useArenaStore((s) => s.state);
  const frame = useArenaStore((s) => s.frame);
  const selectedUid = useArenaStore((s) => s.selectedUid);
  const selectCard = useArenaStore((s) => s.selectCard);
  const deployToLane = useArenaStore((s) => s.deployToLane);
  const useHype = useArenaStore((s) => s.useHype);
  const pickWaveReward = useArenaStore((s) => s.pickWaveReward);
  const forceEnd = useArenaStore((s) => s.forceEnd);
  const clear = useArenaStore((s) => s.clear);
  const applyOutcome = useGameStore((s) => s.applyBattleOutcome);

  const [outcome, setOutcome] = useState<BattleOutcomeResult | null>(null);
  const [arenaScore, setArenaScore] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [energyPulse, setEnergyPulse] = useState(false);
  const finalizedRef = useRef(false);

  // Finalize when the battle ends (won/lost).
  useEffect(() => {
    if (!state || finalizedRef.current) return;
    if (state.status !== "won" && state.status !== "lost") return;
    finalizedRef.current = true;
    finalize(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status]);

  function finalize(arena: ArenaBattleState) {
    const legacy = arenaToBattleState(arena);
    const score = computeArenaScore(arena);
    setArenaScore(score.total);
    const result = applyOutcome(legacy, { mode: arena.mode, entryType: "free" });
    setOutcome(result);
    // Best-effort server submission (reuses existing edge function path).
    void import("@/lib/api/battle").then(({ submitBattleResult }) =>
      submitBattleResult(legacy, { score: score.total, entryType: "free" }),
    );
  }

  function handleLaneClick(lane: Lane) {
    if (!selectedUid) return;
    const ok = deployToLane(lane);
    if (!ok) {
      setEnergyPulse(true);
      setTimeout(() => setEnergyPulse(false), 350);
    }
  }

  function exitBattle() {
    clear();
    router.push("/play");
  }

  if (!state) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Zap className="size-10 text-muted" />
        <h2 className="font-display text-xl font-bold">No active battle</h2>
        <p className="text-sm text-muted">Pick a mode to enter the arena.</p>
        <Button onClick={() => router.push("/play")}>Go to Play</Button>
      </div>
    );
  }

  const selecting = !!selectedUid;
  const baseHit = state.shake > 0.1 && state.units.some((u) => u.owner === "enemy" && u.position < 6);

  return (
    <motion.div
      className="relative mx-auto flex h-full min-h-[560px] w-full max-w-2xl flex-col overflow-hidden px-2 py-2 sm:px-3"
      animate={state.shake > 0.05 ? { x: [0, -state.shake * 6, state.shake * 6, 0] } : {}}
      transition={{ duration: 0.18 }}
    >
      {/* board flash overlay */}
      <AnimatePresence>
        {state.flash && state.flashTtl > 0 && (
          <motion.div
            key={`${state.flash}_${state.battleTime}`}
            className="pointer-events-none absolute inset-0 z-30"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ background: flashColor(state.flash) }}
          />
        )}
      </AnimatePresence>

      {/* TOP: boss core + intent */}
      <div className="shrink-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="lime" className="text-[10px]">
            {state.mode.replace("_", " ").toUpperCase()}
            {state.mode === "survival" ? ` · Wave ${state.wave}` : ""}
          </Badge>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] tabular-nums text-muted">{Math.floor(state.battleTime / 1000)}s</span>
            <button onClick={() => setShowLog((v) => !v)} className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-muted hover:text-foreground">
              <ScrollText className="size-3.5" />
            </button>
            <button onClick={() => forceEnd("lost")} className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-muted hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        </div>
        <BossCore boss={state.boss} coreShield={bossCoreShield(state)} />
        <BossIntentBar boss={state.boss} />
      </div>

      {/* CENTER: arena board (flex-1) */}
      <div className="relative my-2 min-h-0 flex-1">
        <ArenaBoard state={state} frame={frame} selecting={selecting} onLaneClick={handleLaneClick} />
        <ComboCinematicBanner combos={state.activeCombos} />
      </div>

      {/* BOTTOM: player core, energy, hype, hand */}
      <div className="shrink-0 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <PlayerCore hp={state.playerBaseHp} maxHp={state.playerBaseMaxHp} hit={baseHit} />
          <HypeMeter hype={state.hype} ready={state.hypeReady} onActivate={useHype} />
        </div>
        <EnergyMeter energy={state.energy} maxEnergy={state.maxEnergy} pulse={energyPulse} />
        <ArenaHand
          hand={state.hand}
          energy={state.energy}
          selectedUid={selectedUid}
          onSelect={selectCard}
          cycleCount={state.deckCycle.length}
        />
        <p className="text-center text-[10px] text-muted">
          {selecting ? "Tap a lane in your deploy zone to send the unit." : "Tap a card, then tap a lane."}
        </p>
      </div>

      {/* battle log drawer */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed right-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col border-l border-white/10 bg-background/95 p-4 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold">Battle Log</h3>
              <button onClick={() => setShowLog(false)}><X className="size-4 text-muted" /></button>
            </div>
            <div className="mt-3 flex-1 space-y-1 overflow-y-auto text-xs">
              {[...state.eventLog].reverse().map((l) => (
                <p
                  key={l.id}
                  className={
                    l.kind === "combo" ? "text-gold" :
                    l.kind === "boss" ? "text-red-300" :
                    l.kind === "player" ? "text-lime" :
                    l.kind === "enemy" ? "text-red-300" : "text-muted"
                  }
                >
                  <span className="text-muted/50">{Math.floor(l.t / 1000)}s · </span>{l.text}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* survival wave-reward choice */}
      <AnimatePresence>
        {state.awaitingWaveChoice && (
          <Overlay>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-2xl border border-lime/30 bg-surface p-6 text-center">
              <Trophy className="mx-auto size-10 text-lime" />
              <h2 className="mt-3 font-display text-2xl font-bold">Wave {state.wave} Cleared!</h2>
              <p className="mt-1 text-sm text-muted">Choose a battlefield boon.</p>
              <div className="mt-5 grid gap-2">
                <Button onClick={() => pickWaveReward("energy")}><Zap className="size-4" /> +1 Max Energy</Button>
                <Button variant="ghost" onClick={() => pickWaveReward("heal")}><Heart className="size-4" /> Repair Base (+30%)</Button>
                <Button variant="ghost" onClick={() => pickWaveReward("hype")}><Flame className="size-4" /> +50 Hype</Button>
              </div>
              <button onClick={() => forceEnd("won")} className="mt-3 text-xs text-muted underline">Cash out now</button>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* result overlay */}
      <AnimatePresence>
        {outcome && (
          <Overlay>
            <ResultCard
              arena={state}
              won={state.status === "won"}
              outcome={outcome}
              score={arenaScore}
              onReplay={() => router.push("/play")}
              onExit={exitBattle}
            />
          </Overlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function flashColor(palette: string): string {
  const map: Record<string, string> = {
    gold: "radial-gradient(circle, rgba(255,210,74,0.5), transparent 70%)",
    magenta: "radial-gradient(circle, rgba(255,43,214,0.5), transparent 70%)",
    lime: "radial-gradient(circle, rgba(182,255,27,0.5), transparent 70%)",
    purple: "radial-gradient(circle, rgba(180,90,255,0.5), transparent 70%)",
    emerald: "radial-gradient(circle, rgba(60,220,140,0.5), transparent 70%)",
    cyan: "radial-gradient(circle, rgba(60,220,255,0.5), transparent 70%)",
    indigo: "radial-gradient(circle, rgba(120,120,255,0.5), transparent 70%)",
    red: "radial-gradient(circle, rgba(255,60,70,0.45), transparent 70%)",
  };
  return map[palette] ?? map.gold;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
}

function ResultCard({
  arena,
  won,
  outcome,
  score,
  onReplay,
  onExit,
}: {
  arena: ArenaBattleState;
  won: boolean;
  outcome: BattleOutcomeResult;
  score: number;
  onReplay: () => void;
  onExit: () => void;
}) {
  const r = outcome.reward;
  const reasonText = TOKEN_REASON_TEXT[outcome.tokenReason] ?? "";
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className={`w-full max-w-md rounded-3xl border p-6 text-center ${won ? "border-lime/40 bg-gradient-to-b from-lime/10 to-surface" : "border-red-500/30 bg-gradient-to-b from-red-500/10 to-surface"}`}
    >
      {won ? <Trophy className="mx-auto size-12 text-lime" /> : <Skull className="mx-auto size-12 text-red-400" />}
      <h2 className="mt-2 font-display text-3xl font-bold">{won ? "Victory!" : "Defeated"}</h2>
      {outcome.leveledUp && <Badge tone="gold" className="mt-2">Level up! Now level {outcome.newLevel}</Badge>}
      <p className="mt-1 text-sm text-muted">Score: {score.toLocaleString()}</p>

      {/* arena breakdown */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs">
        <Stat label="Clear Time" value={`${Math.floor(arena.battleTime / 1000)}s`} />
        <Stat label="Base HP" value={`${Math.round((arena.playerBaseHp / arena.playerBaseMaxHp) * 100)}%`} />
        <Stat label="Boss Damage" value={Math.round(arena.totalBossDamage).toLocaleString()} />
        <Stat label="Combos" value={String(arena.combosTriggered.length)} />
        {arena.mode === "survival" && <Stat label="Wave" value={String(arena.wave)} />}
        <Stat label="Units Lost" value={String(arena.unitsLost)} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Reward label="Coins" value={r.coins} kind="coins" />
        <Reward label="XP" value={r.xp} kind="xp" />
        <Reward label="Shards" value={r.shards} kind="shards" />
        <Reward label="Tickets" value={r.tickets} kind="tickets" />
      </div>

      <div className="mt-3 rounded-2xl border border-lime/30 bg-lime/5 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted">Pending MEMEARENA</p>
        <p className="mt-0.5 font-display text-2xl font-bold text-lime">
          {r.memearena > 0 ? `+${formatToken(r.memearena, "")}` : "0"}
        </p>
        {reasonText && <p className="mt-1 text-xs text-gold">{reasonText}</p>}
        {r.memearena > 0 && <p className="mt-1 text-xs text-muted">Approved — claim on the Claim page.</p>}
      </div>

      <div className="mt-5 flex gap-2">
        <Button className="flex-1" onClick={onReplay}>Play Again <ArrowRight className="size-4" /></Button>
        <Button variant="ghost" onClick={onExit}>Modes</Button>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Reward({ label, value, kind }: { label: string; value: number; kind: "coins" | "xp" | "shards" | "tickets" }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <span className="text-xs text-muted">{label}</span>
      <CurrencyChip kind={kind} value={value} className="border-0 bg-transparent px-0" />
    </div>
  );
}
