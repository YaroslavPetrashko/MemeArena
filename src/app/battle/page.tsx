"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Shield,
  Zap,
  Swords,
  Flag,
  ScrollText,
  X,
  Trophy,
  Skull,
  ArrowRight,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BossArt } from "@/components/game/BossArt";
import { GameCard } from "@/components/game/GameCard";
import { StatusPills } from "@/components/battle/StatusPills";
import { Badge } from "@/components/ui/Badge";
import { CurrencyChip } from "@/components/ui/CurrencyChip";
import { useBattleStore } from "@/store/battleStore";
import { useGameStore, type BattleOutcomeResult } from "@/store/gameStore";
import { getCard } from "@/data/cards";
import { getBoss } from "@/data/bosses";
import { resolveCard } from "@/lib/game/upgrades";
import { submitBattleResult } from "@/lib/api/battle";
import { computeScore } from "@/lib/game/scoring";
import { formatToken } from "@/lib/utils/format";
import type { BattleState } from "@/types";

const TOKEN_REASON_TEXT: Record<string, string> = {
  ok: "",
  loss: "No token reward — you were defeated.",
  guest_no_wallet: "Connect a wallet to earn claimable MEMEARENA.",
  below_min_wave: "Reach wave 5+ to earn MEMEARENA in Survival.",
  cap_reached: "Daily reward cap reached — come back tomorrow.",
  under_review: "Reward flagged for validation review.",
};

export default function BattlePage() {
  const router = useRouter();
  const state = useBattleStore((s) => s.state);
  const banners = useBattleStore((s) => s.banners);
  const fx = useBattleStore((s) => s.fx);
  const play = useBattleStore((s) => s.play);
  const end = useBattleStore((s) => s.end);
  const nextWave = useBattleStore((s) => s.nextWave);
  const clearBanner = useBattleStore((s) => s.clearBanner);
  const clear = useBattleStore((s) => s.clear);
  const applyOutcome = useGameStore((s) => s.applyBattleOutcome);

  const [outcome, setOutcome] = useState<BattleOutcomeResult | null>(null);
  const [waveCleared, setWaveCleared] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const finalizedRef = useRef(false);

  // Combo banner auto-dismiss.
  useEffect(() => {
    if (!banners.length) return;
    const t = setTimeout(() => clearBanner(), 1300);
    return () => clearTimeout(t);
  }, [banners, clearBanner]);

  // Detect battle end → finalize (or show wave-cleared for survival wins).
  useEffect(() => {
    if (!state || state.result === "ongoing" || finalizedRef.current) return;
    if (state.mode === "survival" && state.result === "win") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWaveCleared(true);
      return;
    }
    finalize(state, state.mode === "survival" ? Math.max(0, (state.wave ?? 1) - 1) : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.result]);

  function finalize(battle: BattleState, overrideWave?: number) {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    const battleForReward: BattleState =
      overrideWave !== undefined ? { ...battle, wave: overrideWave } : battle;
    const score = computeScore(battleForReward).total;
    const result = applyOutcome(battleForReward, { mode: battle.mode, entryType: "free" });
    setOutcome(result);
    void submitBattleResult(battleForReward, { score, entryType: "free" });
  }

  if (!state) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Swords className="size-10 text-muted" />
        <h2 className="font-display text-xl font-bold">No active battle</h2>
        <p className="text-sm text-muted">Pick a mode to start fighting.</p>
        <Button onClick={() => router.push("/play")}>Go to Play</Button>
      </div>
    );
  }

  const boss = getBoss(state.enemy.bossId);
  const p = state.player;
  const e = state.enemy;
  const playerHurt = fx.some((f) => f.target === "player" && (f.kind === "damage" || f.kind === "crit"));
  const enemyHurt = fx.some((f) => f.target === "enemy" && (f.kind === "damage" || f.kind === "crit"));

  function handleContinueWave() {
    setWaveCleared(false);
    nextWave();
  }
  function handleCashOut() {
    setWaveCleared(false);
    finalize(state!, state!.wave);
  }
  function exitBattle() {
    clear();
    router.push("/play");
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge tone="lime">{state.mode.replace("_", " ").toUpperCase()}{state.wave ? ` · Wave ${state.wave}` : ""}</Badge>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Turn {state.turn}</span>
          <button onClick={() => setShowLog((v) => !v)} className="rounded-lg border border-white/10 bg-white/5 p-2 text-muted hover:text-foreground">
            <ScrollText className="size-4" />
          </button>
          <button onClick={exitBattle} className="rounded-lg border border-white/10 bg-white/5 p-2 text-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Enemy */}
      <motion.div
        animate={enemyHurt ? { x: [0, -8, 8, -4, 0] } : {}}
        transition={{ duration: 0.35 }}
        className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-surface"
      >
        <div className="grid grid-cols-[110px_1fr] gap-3 p-3 sm:grid-cols-[150px_1fr]">
          <BossArt boss={boss!} className="aspect-square rounded-xl" />
          <div className="flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold leading-tight">{e.name}</h2>
              <span className="text-sm tabular-nums text-red-300">{e.hp}/{e.maxHp}</span>
            </div>
            <ProgressBar value={e.hp} max={e.maxHp} barClassName="bg-gradient-to-r from-red-500 to-rose-400" showShield shield={e.shield} />
            <StatusPills statuses={e.statuses} />
            {/* Intent */}
            {e.intent && state.result === "ongoing" && (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs text-red-200">
                <Swords className="size-3.5" /> <span className="font-medium">Intent:</span> {e.intent.intentText}
              </div>
            )}
          </div>
        </div>
        {/* Enemy FX floats */}
        <FxLayer fx={fx} target="enemy" />
      </motion.div>

      {/* Combo banner */}
      <AnimatePresence>
        {banners.length > 0 && (
          <motion.div
            key={banners[0]}
            initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2"
          >
            <div className="rounded-2xl border border-gold/50 bg-black/70 px-6 py-3 text-center font-display text-2xl font-bold text-gold shadow-[0_0_40px_rgba(255,210,74,0.4)] backdrop-blur">
              {banners[0]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer / battlefield */}
      <div className="flex-1" />

      {/* Player status */}
      <motion.div
        animate={playerHurt ? { x: [0, -6, 6, -3, 0] } : {}}
        transition={{ duration: 0.35 }}
        className="relative mt-4 rounded-2xl border border-white/10 bg-surface p-3"
      >
        <FxLayer fx={fx} target="player" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-rose-300">
            <Heart className="size-4" />
            <span className="tabular-nums font-semibold">{p.hp}/{p.maxHp}</span>
          </div>
          {p.shield > 0 && (
            <div className="flex items-center gap-1.5 text-sky-300">
              <Shield className="size-4" /> <span className="tabular-nums font-semibold">{p.shield}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            {Array.from({ length: p.maxEnergy }).map((_, i) => (
              <span
                key={i}
                className={`h-4 w-2.5 rounded-sm ${i < p.energy ? "bg-gradient-to-b from-lime to-lime-deep shadow-[0_0_8px_var(--lime)]" : "bg-white/10"}`}
              />
            ))}
            <Zap className="ml-1 size-4 text-lime" />
            <span className="tabular-nums text-sm font-semibold text-lime">{p.energy}</span>
          </div>
        </div>
        <div className="mt-2">
          <ProgressBar value={p.hp} max={p.maxHp} barClassName="bg-gradient-to-r from-rose-500 to-pink-400" showShield shield={p.shield} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <StatusPills statuses={p.statuses} />
          <Button
            size="sm"
            variant="magenta"
            onClick={() => end()}
            disabled={state.result !== "ongoing"}
          >
            <Flag className="size-4" /> End Turn
          </Button>
        </div>
      </motion.div>

      {/* Hand */}
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {p.hand.map((bc) => {
          const card = getCard(bc.cardId)!;
          const resolved = resolveCard(bc.cardId, bc.level);
          const cost = Math.max(0, (resolved?.cost ?? bc.cost) - p.nextCardDiscount);
          const unaffordable = p.energy < cost || state.result !== "ongoing";
          return (
            <GameCard
              key={bc.uid}
              card={card}
              level={bc.level}
              cost={cost}
              disabled={unaffordable}
              onClick={() => play(bc.uid)}
            />
          );
        })}
        {p.hand.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-white/10 py-6 text-center text-xs text-muted">
            Hand empty — End Turn to draw.
          </div>
        )}
      </div>
      <p className="mt-1 text-center text-[10px] text-muted">
        Draw pile: {p.deck.length} · Discard: {p.discard.length}
      </p>

      {/* Battle log drawer */}
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
            <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto text-xs">
              {[...state.log].reverse().map((l) => (
                <p
                  key={l.id}
                  className={
                    l.kind === "combo" ? "text-gold" :
                    l.kind === "reward" ? "text-lime" :
                    l.kind === "enemy" ? "text-red-300" :
                    l.kind === "player" ? "text-foreground" : "text-muted"
                  }
                >
                  <span className="text-muted/50">T{l.turn} · </span>{l.text}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wave cleared overlay (Survival) */}
      <AnimatePresence>
        {waveCleared && (
          <Overlay>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-2xl border border-lime/30 bg-surface p-6 text-center">
              <Trophy className="mx-auto size-10 text-lime" />
              <h2 className="mt-3 font-display text-2xl font-bold">Wave {state.wave} Cleared!</h2>
              <p className="mt-1 text-sm text-muted">Push your luck for bigger rewards, or cash out now.</p>
              <div className="mt-5 flex flex-col gap-2">
                <Button onClick={handleContinueWave}>
                  <ChevronUp className="size-4" /> Continue to Wave {(state.wave ?? 1) + 1}
                </Button>
                <Button variant="ghost" onClick={handleCashOut}>Cash Out</Button>
              </div>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* Result overlay */}
      <AnimatePresence>
        {outcome && (
          <Overlay>
            <ResultCard
              won={state.result === "win" || (state.mode === "survival" && (state.player.hp > 0))}
              outcome={outcome}
              onReplay={() => router.push("/play")}
              onExit={exitBattle}
            />
          </Overlay>
        )}
      </AnimatePresence>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
}

function ResultCard({
  won,
  outcome,
  onReplay,
  onExit,
}: {
  won: boolean;
  outcome: BattleOutcomeResult;
  onReplay: () => void;
  onExit: () => void;
}) {
  const r = outcome.reward;
  const reasonText = TOKEN_REASON_TEXT[outcome.tokenReason] ?? "";
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className={`w-full max-w-md rounded-3xl border p-7 text-center ${won ? "border-lime/40 bg-gradient-to-b from-lime/10 to-surface" : "border-red-500/30 bg-gradient-to-b from-red-500/10 to-surface"}`}
    >
      {won ? <Trophy className="mx-auto size-12 text-lime" /> : <Skull className="mx-auto size-12 text-red-400" />}
      <h2 className="mt-3 font-display text-3xl font-bold">{won ? "Victory!" : "Defeated"}</h2>
      {outcome.leveledUp && (
        <Badge tone="gold" className="mt-2">Level up! Now level {outcome.newLevel}</Badge>
      )}
      <p className="mt-1 text-sm text-muted">Score: {outcome.score.toLocaleString()}</p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Reward label="Coins" value={r.coins} kind="coins" />
        <Reward label="XP" value={r.xp} kind="xp" />
        <Reward label="Shards" value={r.shards} kind="shards" />
        <Reward label="Tickets" value={r.tickets} kind="tickets" />
      </div>

      <div className="mt-3 rounded-2xl border border-lime/30 bg-lime/5 p-4">
        <p className="text-xs uppercase tracking-wider text-muted">Pending MEMEARENA</p>
        <p className="mt-1 font-display text-3xl font-bold text-lime">
          {r.memearena > 0 ? `+${formatToken(r.memearena, "")}` : "0"}
        </p>
        {reasonText && <p className="mt-1 text-xs text-gold">{reasonText}</p>}
        {r.memearena > 0 && <p className="mt-1 text-xs text-muted">Approved — claim on the Claim page.</p>}
      </div>

      <div className="mt-6 flex gap-2">
        <Button className="flex-1" onClick={onReplay}>
          Play Again <ArrowRight className="size-4" />
        </Button>
        <Button variant="ghost" onClick={onExit}>Modes</Button>
      </div>
    </motion.div>
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

function FxLayer({ fx, target }: { fx: { id: string; target: string; kind: string; value?: number; label?: string }[]; target: "enemy" | "player" }) {
  const items = fx.filter((f) => f.target === target);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center gap-3">
        {items.map((f, i) => {
          let text = "";
          let color = "text-white";
          if (f.kind === "damage") { text = `-${f.value}`; color = "text-red-400"; }
          else if (f.kind === "crit") { text = `CRIT -${f.value}!`; color = "text-gold"; }
          else if (f.kind === "heal") { text = `+${f.value}`; color = "text-emerald-400"; }
          else if (f.kind === "shield") { text = `+${f.value}🛡`; color = "text-sky-300"; }
          else if (f.kind === "stun") { text = "STUN"; color = "text-yellow-300"; }
          else if (f.kind === "energy") { text = `+${f.value}⚡`; color = "text-lime"; }
          else if (f.kind === "misfire") { text = "MISFIRE"; color = "text-fuchsia-400"; }
          else if (f.kind === "status") { text = f.label ?? ""; color = "text-fuchsia-300"; }
          if (!text) return null;
          return (
            <span
              key={f.id}
              className={`fx-float font-display text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${color}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
