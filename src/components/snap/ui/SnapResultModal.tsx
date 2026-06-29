"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Coins, Gem, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { SnapMatchState } from "@/types/snap";
import type { Reward } from "@/types";
import { useSnapSound } from "./useSnapSound";

interface Props {
  open: boolean;
  match: SnapMatchState | null;
  reward: Reward | null;
  tokenReason: string;
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
  canContinue,
  onPlayAgain,
  onContinue,
  onExit,
}: Props) {
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
