"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Swords,
  Lock,
  Check,
  AlertTriangle,
  ChevronRight,
  Heart,
} from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SnapBossArt } from "@/components/snap/SnapBossArt";
import { useGameStore } from "@/store/gameStore";
import { useSnapLaunch } from "@/store/snapLaunchStore";
import { useMounted } from "@/hooks/useMounted";
import { GAME_MODES_BY_ID } from "@/data/modes";
import { getSnapBoss, BOSS_RUSH_ORDER, bossDifficultyValue } from "@/data/snapBosses";
import { isBossUnlocked, nextBossRushBoss } from "@/lib/game/progression";
import posthog from "posthog-js";

const ARENA = "arena" as const;

export default function PlayPage() {
  const mounted = useMounted();
  const router = useRouter();
  const save = useGameStore((s) => s.save);
  const consumeEntry = useGameStore((s) => s.consumeEntry);
  const deckPower = useGameStore((s) => s.deckPower());
  const setLaunch = useSnapLaunch((s) => s.setConfig);

  const deck = save.deck.map((id) => ({ cardId: id, level: save.ownedCards[id]?.level ?? 1 }));
  const walletConnected = !!save.profile.walletAddress;

  const def = GAME_MODES_BY_ID[ARENA];
  const nextBoss = nextBossRushBoss(save.defeatedBossIds);

  function launch() {
    // Arena is free + unlimited.
    const ok = consumeEntry(ARENA, "free");
    if (!ok) return;
    const bossId = nextBoss.id;
    posthog.capture("battle_started", {
      mode: ARENA,
      boss_id: bossId,
      entry_method: "free",
      deck_size: deck.length,
      wallet_connected: walletConnected,
    });
    setLaunch({ mode: ARENA, bossId, deck, entryType: "free" });
    router.push("/battle");
  }

  return (
    <div className="space-y-8">
      <SectionTitle title="Enter the Arena" subtitle="Beat the opponent across three locations to earn MEMEARENA." />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Panel className="overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[280px_1fr]">
            <SnapBossArt boss={getSnapBoss(nextBoss.id)!} className="h-56 md:h-full" />
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <div className="grid size-11 place-items-center rounded-xl bg-lime/10">
                  <Swords className="size-5 text-foreground" />
                </div>
                <h2 className="font-display text-2xl font-bold">{def.name}</h2>
                <Badge tone="gold">{def.rewardSummary}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{def.description}</p>

              {/* Opponent preview */}
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Next opponent</p>
                  <p className="font-display font-bold">{getSnapBoss(nextBoss.id)!.name}</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-sm text-red-300">
                  <Heart className="size-4" /> Difficulty {bossDifficultyValue(getSnapBoss(nextBoss.id)!)}
                </div>
              </div>

              {/* Wallet note */}
              {mounted && !walletConnected && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
                  <AlertTriangle className="size-3.5" />
                  Playing as guest — you&apos;ll earn Coins/XP but no claimable MEMEARENA. Connect a wallet to earn tokens.
                </div>
              )}

              {/* Entry */}
              <div className="mt-5">
                <Button onClick={launch}>
                  <Check className="size-4" /> Free Entry
                </Button>
              </div>

              {/* Opponent ladder */}
              <div className="mt-6">
                <p className="mb-2 text-xs uppercase tracking-wider text-muted">Opponent ladder</p>
                <div className="flex flex-wrap gap-2">
                  {BOSS_RUSH_ORDER.map((id) => {
                    const boss = getSnapBoss(id)!;
                    const unlocked = isBossUnlocked(id, {
                      playerLevel: save.profile.player_level,
                      defeatedBossIds: save.defeatedBossIds,
                      deckPower,
                    });
                    const defeated = save.defeatedBossIds.includes(id);
                    return (
                      <div
                        key={id}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                          defeated
                            ? "border-lime/30 bg-lime/10 text-lime"
                            : unlocked
                              ? "border-white/15 bg-white/5"
                              : "border-white/8 bg-black/20 text-muted"
                        }`}
                      >
                        {defeated ? <Check className="size-3" /> : !unlocked ? <Lock className="size-3" /> : <ChevronRight className="size-3" />}
                        {boss.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </motion.div>
    </div>
  );
}
