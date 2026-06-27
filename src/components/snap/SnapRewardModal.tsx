"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CurrencyChip } from "@/components/ui/CurrencyChip";
import type { SnapMatchState } from "@/types/snap";
import type { Reward } from "@/types";

interface Props {
  open: boolean;
  match: SnapMatchState | null;
  reward: Reward | null;
  tokenReason: string;
  leveledUp: boolean;
  newLevel: number;
  /** Survival: offer to continue the run. */
  canContinue?: boolean;
  onPlayAgain: () => void;
  onContinue?: () => void;
  onExit: () => void;
}

export function SnapRewardModal({
  open,
  match,
  reward,
  tokenReason,
  leveledUp,
  newLevel,
  canContinue,
  onPlayAgain,
  onContinue,
  onExit,
}: Props) {
  const s = match?.scoring;
  const won = s?.result === "win";

  return (
    <AnimatePresence>
      {open && s && reward && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="glass rounded-3xl p-6 max-w-md w-full text-center ring-1 ring-white/10"
          >
            <div className={cnVerdict(s.result)}>
              {won ? "VICTORY" : s.result === "draw" ? "DRAW" : "DEFEAT"}
            </div>
            <p className="text-sm text-muted mt-1">
              {s.locationsWon}/{match.locations.length} locations · Power {s.playerTotalPower}–{s.bossTotalPower}
            </p>
            {s.apeInActive && (
              <p className="text-xs text-gold mt-1">🔥 Aped In · {s.apeInMultiplier}× rewards</p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <CurrencyChip kind="coins" value={reward.coins} className="justify-center" />
              <CurrencyChip kind="xp" value={reward.xp} className="justify-center" />
              {reward.shards > 0 && <CurrencyChip kind="shards" value={reward.shards} className="justify-center" />}
              {reward.tickets > 0 && <CurrencyChip kind="tickets" value={reward.tickets} className="justify-center" />}
            </div>

            {reward.memearena > 0 ? (
              <div className="mt-3">
                <CurrencyChip kind="memearena" value={reward.memearena} decimals className="justify-center mx-auto" />
                <p className="text-[10px] text-muted mt-1">
                  Pending server validation. <Link href="/claim" className="text-lime underline">Claim page →</Link>
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted mt-3">{rewardReasonCopy(tokenReason)}</p>
            )}

            {leveledUp && (
              <div className="mt-3 text-sm font-display font-bold text-gradient">
                Level Up! You&apos;re now level {newLevel} 🎉
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              {canContinue && onContinue && won && (
                <Button variant="gold" onClick={onContinue}>Continue Run →</Button>
              )}
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1" onClick={onPlayAgain}>Play Again</Button>
                <Button variant="ghost" className="flex-1" onClick={onExit}>Exit</Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function cnVerdict(result: string): string {
  const base = "font-display text-4xl font-black tracking-tight";
  if (result === "win") return `${base} text-lime`;
  if (result === "loss") return `${base} text-red-400`;
  return `${base} text-white/70`;
}

function rewardReasonCopy(reason: string): string {
  switch (reason) {
    case "guest_no_wallet":
      return "Connect a wallet to earn claimable MEMEARENA.";
    case "loss":
      return "No token reward on a loss — but the Coins & XP are yours.";
    case "below_min_wave":
      return "Reach wave 5+ in Survival to earn MEMEARENA.";
    case "cap_reached":
      return "Daily MEMEARENA cap reached. Come back tomorrow!";
    default:
      return "Play for fun. Bonk responsibly.";
  }
}
