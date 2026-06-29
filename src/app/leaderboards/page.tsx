"use client";

import { useMemo, useState } from "react";
import { Trophy, Medal, Crown } from "lucide-react";
import { SectionTitle, Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/badge";
import { useGameStore } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { getMockLeaderboard } from "@/data/mockLeaderboards";
import { GAME_MODES_BY_ID } from "@/data/modes";
import { RankBadge } from "@/components/ui/RankBadge";
import { rankForRp, APEX_RP } from "@/data/ranks";
import { formatNumber, shortAddress } from "@/lib/utils/format";
import type { GameModeId, LeaderboardEntry, LeaderboardPeriod } from "@/types";
import { cn } from "@/lib/utils/cn";

const BOARDS: { mode: GameModeId; period: LeaderboardPeriod }[] = [
  { mode: "arena", period: "weekly" },
  { mode: "arena", period: "all_time" },
];

export default function LeaderboardsPage() {
  const mounted = useMounted();
  const save = useGameStore((s) => s.save);
  const [active, setActive] = useState(0);
  const board = BOARDS[active];

  // Best player score for this mode from local reward ledger metadata.
  const playerEntry: LeaderboardEntry | null = useMemo(() => {
    const scores = save.rewardLedger
      .filter((r) => (r.metadata?.mode as string) === board.mode && typeof r.metadata?.score === "number")
      .map((r) => r.metadata.score as number);
    const best = scores.length ? Math.max(...scores) : 0;
    if (best <= 0) return null;
    return {
      id: "you",
      profile_id: save.profile.id,
      username: save.profile.username,
      wallet_address: save.profile.walletAddress,
      mode: board.mode,
      period: board.period,
      score: best,
      rank: null,
      metadata: { you: true },
    };
  }, [save.rewardLedger, save.profile, board]);

  const entries = useMemo(() => {
    const merged = [...getMockLeaderboard(board.mode, board.period)];
    if (playerEntry) merged.push(playerEntry);
    merged.sort((a, b) => b.score - a.score);
    return merged.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [board, playerEntry]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Leaderboards" subtitle="Top degens by mode. Weekly boards reset and pay bonus MEMEARENA." />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {BOARDS.map((b, i) => (
          <button
            key={`${b.mode}_${b.period}`}
            onClick={() => setActive(i)}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
              active === i ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            {GAME_MODES_BY_ID[b.mode].name}
            <span className="ml-1.5 text-[10px] uppercase opacity-60">{b.period.replace("_", " ")}</span>
          </button>
        ))}
      </div>

      {board.period === "weekly" && (
        <Badge tone="magenta"><Crown className="size-3" /> Top players win bonus MEMEARENA weekly</Badge>
      )}

      <Panel className="overflow-hidden">
        <div className="divide-y divide-border">
          {entries.slice(0, 25).map((e) => {
            const you = e.metadata?.you === true;
            const entryRank = you
              ? rankForRp(save.profile.rankPoints)
              : rankForRp(Math.max(0, APEX_RP + 200 - (e.rank! - 1) * 110));
            return (
              <div
                key={e.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  you && "bg-primary/10",
                  e.rank! <= 3 && "bg-gradient-to-r from-foreground/[0.04] to-transparent",
                )}
              >
                <div className="w-8 shrink-0 text-center">
                  {e.rank === 1 ? <Crown className="mx-auto size-5 text-gold" /> :
                   e.rank === 2 ? <Medal className="mx-auto size-5 text-zinc-300" /> :
                   e.rank === 3 ? <Medal className="mx-auto size-5 text-amber-700" /> :
                   <span className="font-mono text-sm text-muted">{e.rank}</span>}
                </div>
                <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-lime/30 to-magenta/30 font-display text-xs font-bold">
                  {e.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {you ? "You" : e.username}
                    {you && <Badge tone="lime" className="ml-2">You</Badge>}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <RankBadge rank={entryRank} size="sm" />
                    {e.wallet_address && <span className="truncate text-[11px] text-muted-foreground">{shortAddress(e.wallet_address)}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold tabular-nums">{formatNumber(e.score)}</p>
                  {typeof e.metadata?.memearenaWon === "number" && (
                    <p className="text-[10px] text-lime">{e.metadata.memearenaWon} MEMEARENA</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {mounted && !playerEntry && (
        <p className="text-center text-xs text-muted">
          <Trophy className="mr-1 inline size-3" /> Win a battle in this mode to put your name on the board.
        </p>
      )}
    </div>
  );
}
