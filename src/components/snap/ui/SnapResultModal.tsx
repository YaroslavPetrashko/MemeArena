"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Coins, Gem, Trophy, Sparkles, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RankBadge } from "@/components/ui/RankBadge";
import { cn } from "@/lib/utils/cn";
import type { SnapMatchState } from "@/types/snap";
import type { Reward } from "@/types";
import type { Rank } from "@/data/ranks";
import { useSnapSound } from "./useSnapSound";
import { SnapCard } from "@/components/snap/SnapCard";
import { displayCard } from "@/components/snap/displayCard";
import { SNAP_CARDS_BY_ID } from "@/data/snapCards";

interface Props {
  open: boolean;
  match: SnapMatchState | null;
  reward: Reward | null;
  tokenReason: string;
  /** A card unlocked by winning this match, shown as a reveal. */
  unlockedCardId?: string;
  /** Competitive ladder result for this match. */
  rpDelta?: number;
  rank?: Rank;
  rankUp?: boolean;
  streak?: number;
  canContinue?: boolean;
  onPlayAgain: () => void;
  onContinue?: () => void;
  onExit: () => void;
}

function rewardReasonCopy(reason: string): string {
  switch (reason) {
    case "guest_no_wallet":
      return "Connect a wallet to earn claimable MEMEARENA.";
    case "loss":
      return "No token reward on a loss — but the Coins are yours.";
    case "below_min_wave":
      return "Reach wave 5+ in Survival to earn MEMEARENA.";
    case "cap_reached":
      return "Daily MEMEARENA cap reached. Come back tomorrow!";
    default:
      return "Play for fun. Bonk responsibly.";
  }
}

export function SnapResultModal({
  open,
  match,
  reward,
  tokenReason,
  unlockedCardId,
  rpDelta,
  rank,
  rankUp,
  streak,
  canContinue,
  onPlayAgain,
  onContinue,
  onExit,
}: Props) {
  const unlockedCard = unlockedCardId ? SNAP_CARDS_BY_ID[unlockedCardId] : undefined;
  const s = match?.scoring;
  const won = s?.result === "win";
  const sound = useSnapSound();

  useEffect(() => {
    if (open && s) sound.play(won ? "win" : "loss");
  }, [open, s, won, sound]);

  const verdict = won ? "VICTORY" : s?.result === "draw" ? "DRAW" : "DEFEAT";
  const verdictColor = won ? "text-lime" : s?.result === "draw" ? "text-violet-300" : "text-red-400";
  const verdictGlow = won
    ? "drop-shadow-[0_0_24px_rgba(182,255,27,0.6)]"
    : s?.result === "draw"
      ? "drop-shadow-[0_0_18px_rgba(160,130,255,0.5)]"
      : "drop-shadow-[0_0_20px_rgba(255,60,90,0.5)]";

  return (
    <AnimatePresence>
      {open && s && reward && match && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.85, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-[#0a0712]/95 p-6 text-center ring-1 ring-white/10"
          >
            {/* verdict sweep */}
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className={cn("font-display text-5xl font-black tracking-tight", verdictColor, verdictGlow)}
            >
              {verdict}
            </motion.div>

            {/* per-location verdict pips, judged left→right */}
            <div className="mt-4 flex justify-center gap-2">
              {s.locations.map((loc, i) => {
                const tone =
                  loc.winner === "player"
                    ? "bg-lime text-black"
                    : loc.winner === "boss"
                      ? "bg-red-500 text-white"
                      : "bg-violet-400 text-black";
                const name = match.locations.find((l) => l.id === loc.locationId)?.name ?? "Location";
                return (
                  <motion.div
                    key={loc.locationId}
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.25 + i * 0.18, type: "spring", stiffness: 300, damping: 16 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className={cn("grid size-10 place-items-center snap-hex font-display text-xs font-black", tone)}>
                      {loc.winner === "player" ? "WON" : loc.winner === "boss" ? "LOST" : "TIE"}
                    </span>
                    <span className="max-w-[64px] truncate text-[9px] text-white/55">{name}</span>
                  </motion.div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-muted">
              {s.locationsWon} won · {s.locationsLost} lost · {s.locationsTied} tied · Power{" "}
              <span className="text-white/80">
                {s.playerTotalPower}–{s.bossTotalPower}
              </span>{" "}
              ({s.powerDifferential >= 0 ? "+" : ""}
              {s.powerDifferential})
            </p>

            {/* Competitive ladder: RP delta, rank, streak */}
            {typeof rpDelta === "number" && rank && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className={cn(
                  "mt-4 rounded-2xl p-3 ring-1",
                  rankUp ? "bg-gold/10 ring-gold/40" : "bg-white/[0.04] ring-white/10",
                )}
              >
                {rankUp && (
                  <div className="mb-1.5 flex items-center justify-center gap-1.5 font-display text-sm font-black text-gold">
                    <Sparkles className="size-4" /> RANK UP!
                  </div>
                )}
                <div className="flex items-center justify-center gap-3">
                  <RankBadge rank={rank} size="lg" />
                  <span
                    className={cn(
                      "font-display text-lg font-black tabular-nums",
                      rpDelta >= 0 ? "text-lime" : "text-red-400",
                    )}
                  >
                    {rpDelta >= 0 ? "+" : ""}
                    {rpDelta} RP
                  </span>
                </div>
                {!rank.isApex && (
                  <div className="mx-auto mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(rank.rpInto / rank.rpForNext) * 100}%`, backgroundColor: rank.color }}
                    />
                  </div>
                )}
                {typeof streak === "number" && streak >= 2 && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-bold text-orange-300">
                    <Flame className="size-3.5" /> {streak} win streak
                  </div>
                )}
              </motion.div>
            )}

            {/* reward breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-5 grid grid-cols-2 gap-2"
            >
              <RewardTile icon={Coins} color="text-amber-300" label="Coins" value={reward.coins} />
              {reward.gems > 0 && (
                <RewardTile icon={Gem} color="text-fuchsia-300" label="Gems" value={reward.gems} />
              )}
              {reward.memearena > 0 && (
                <RewardTile
                  icon={Trophy}
                  color="text-lime"
                  label="MEMEARENA"
                  value={Math.round(reward.memearena * 100) / 100}
                  className="col-span-2"
                />
              )}
            </motion.div>

            {/* Card unlocked by winning */}
            {won && unlockedCard && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 240, damping: 18 }}
                className="mt-4 rounded-2xl bg-lime/10 p-3 ring-1 ring-lime/30"
              >
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-lime">
                  <Sparkles className="size-3.5" /> New card unlocked!
                </div>
                <div className="mt-2 flex items-center justify-center gap-3">
                  <SnapCard card={displayCard(unlockedCard, 1)} size="md" />
                  <div className="text-left">
                    <p className="font-display font-bold">{unlockedCard.name}</p>
                    <p className="text-[11px] text-white/60">Added to your collection.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {reward.memearena > 0 ? (
              <p className="mt-2 text-[10px] text-muted">
                Pending server validation.{" "}
                <Link href="/claim" className="text-lime underline">
                  Claim page →
                </Link>
              </p>
            ) : (
              <p className="mt-3 text-[11px] text-muted">{rewardReasonCopy(tokenReason)}</p>
            )}

            <div className="mt-6 flex flex-col gap-2">
              {canContinue && onContinue && won && (
                <Button variant="gold" onClick={onContinue}>
                  Continue Run →
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1" onClick={onPlayAgain}>
                  Play Again
                </Button>
                <Button variant="ghost" className="flex-1" onClick={onExit}>
                  Exit
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RewardTile({
  icon: Icon,
  color,
  label,
  value,
  className,
}: {
  icon: typeof Coins;
  color: string;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl bg-white/[0.04] py-3 ring-1 ring-white/10",
        className,
      )}
    >
      <Icon className={cn("size-5", color)} />
      <div className="text-left leading-none">
        <div className="font-display text-lg font-black tabular-nums">{value.toLocaleString()}</div>
        <div className="text-[9px] uppercase tracking-wide text-muted">{label}</div>
      </div>
    </div>
  );
}
