"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords,
  Calendar,
  Infinity as InfinityIcon,
  Zap,
  Crown,
  Lock,
  Gem,
  Check,
  AlertTriangle,
  Heart,
  ChevronRight,
} from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SnapBossArt } from "@/components/snap/SnapBossArt";
import { useGameStore } from "@/store/gameStore";
import { useSnapLaunch } from "@/store/snapLaunchStore";
import { useMounted } from "@/hooks/useMounted";
import { GAME_MODES, GAME_MODES_BY_ID } from "@/data/modes";
import { getSnapBoss, DAILY_BOSS_ID, EVENT_BOSS_ID, BOSS_RUSH_ORDER, bossDifficultyValue } from "@/data/snapBosses";
import { getEntryAvailability, type EntryMethod as EM } from "@/lib/game/entryGates";
import { isBossUnlocked, nextBossRushBoss } from "@/lib/game/progression";
import type { GameModeId } from "@/types";
import type { SnapModeId } from "@/types/snap";
import posthog from "posthog-js";

const MODE_ICON: Record<string, typeof Swords> = {
  boss_rush: Swords,
  daily_boss: Calendar,
  survival: InfinityIcon,
  limited_event: Zap,
  high_roller: Crown,
};

export default function PlayPage() {
  const mounted = useMounted();
  const router = useRouter();
  const save = useGameStore((s) => s.save);
  const consumeEntry = useGameStore((s) => s.consumeEntry);
  const deckPower = useGameStore((s) => s.deckPower());
  const setLaunch = useSnapLaunch((s) => s.setConfig);
  const [selected, setSelected] = useState<GameModeId>("boss_rush");

  const deck = save.deck.map((id) => ({ cardId: id, level: save.ownedCards[id]?.level ?? 1 }));
  const walletConnected = !!save.profile.walletAddress;

  function bossForMode(mode: GameModeId): string {
    if (mode === "daily_boss") return DAILY_BOSS_ID;
    if (mode === "limited_event") return EVENT_BOSS_ID;
    if (mode === "survival") return BOSS_RUSH_ORDER[0];
    return nextBossRushBoss(save.defeatedBossIds).id;
  }

  function launch(mode: GameModeId, method: Exclude<EM, "locked">) {
    const ok = consumeEntry(mode, method);
    if (!ok) return;
    const bossId = bossForMode(mode);
    posthog.capture("battle_started", {
      mode,
      boss_id: bossId,
      entry_method: method,
      deck_size: deck.length,
      wallet_connected: walletConnected,
    });
    setLaunch({
      mode: mode as SnapModeId,
      bossId,
      deck,
      entryType: method,
      survivalWave: mode === "survival" ? 1 : undefined,
      isEvent: mode === "limited_event",
    });
    router.push("/battle");
  }

  const selDef = GAME_MODES_BY_ID[selected];
  const availability = getEntryAvailability(
    selected,
    { freeDailyBossUsed: save.daily.freeDailyBossUsed, freeSurvivalRunsUsed: save.daily.freeSurvivalRunsUsed },
    { gems: save.profile.gems, playerLevel: save.profile.player_level },
  );

  return (
    <div className="space-y-8">
      <SectionTitle title="Choose your battle" subtitle="Pick a mode. Free fights, ticketed grinds, and high-stakes events." />

      {/* Mode grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_MODES.map((mode) => {
          const Icon = MODE_ICON[mode.id] ?? Swords;
          const unlocked = mounted ? save.profile.player_level >= mode.unlockLevel : true;
          const isSel = selected === mode.id;
          const comingSoon = mode.id === "high_roller";
          return (
            <motion.button
              key={mode.id}
              whileHover={{ y: -3 }}
              onClick={() => {
                if (comingSoon) return;
                setSelected(mode.id);
                posthog.capture("game_mode_selected", { mode: mode.id, mode_name: mode.name });
              }}
              disabled={comingSoon}
              className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-colors ${
                isSel ? "border-lime ring-2 ring-lime/40 bg-lime/5" : "border-white/10 bg-surface hover:border-white/25"
              } ${comingSoon ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className={`grid size-11 place-items-center rounded-xl ${mode.accent === "lime" ? "bg-lime/10" : mode.accent === "magenta" ? "bg-magenta/10" : "bg-gold/10"}`}>
                  <Icon className="size-5 text-foreground" />
                </div>
                {!unlocked || comingSoon ? (
                  <Badge tone="neutral"><Lock className="size-3" /> Lvl {mode.unlockLevel}</Badge>
                ) : (
                  <Badge tone="lime">{mode.rewardSummary}</Badge>
                )}
              </div>
              <h3 className="mt-3 font-display text-lg font-bold">{mode.name}</h3>
              <p className="mt-1 text-xs text-muted">{mode.tagline}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Selected mode detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <Panel className="overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[280px_1fr]">
              <SnapBossArt boss={getSnapBoss(bossForMode(selected))!} className="h-56 md:h-full" />
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-bold">{selDef.name}</h2>
                  <Badge tone="gold">{selDef.rewardSummary}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{selDef.description}</p>

                {/* Boss preview */}
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted">Next opponent</p>
                    <p className="font-display font-bold">{getSnapBoss(bossForMode(selected))!.name}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-sm text-red-300">
                    <Heart className="size-4" /> Difficulty {bossDifficultyValue(getSnapBoss(bossForMode(selected))!)}
                  </div>
                </div>

                {/* Wallet note */}
                {mounted && !walletConnected && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
                    <AlertTriangle className="size-3.5" />
                    Playing as guest — you&apos;ll earn Coins/XP but no claimable MEMEARENA. Connect a wallet to earn tokens.
                  </div>
                )}

                {/* Entry options */}
                <div className="mt-5">
                  {!availability.unlocked ? (
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-muted">
                      <Lock className="size-4" /> {availability.reason}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {availability.freeAvailable && (
                        <Button onClick={() => launch(selected, "free")}>
                          <Check className="size-4" /> Free Entry
                          {Number.isFinite(availability.freeRemaining) && (
                            <span className="ml-1 text-xs opacity-80">({availability.freeRemaining} left)</span>
                          )}
                        </Button>
                      )}
                      {availability.options
                        .filter((o) => o.method === "gems")
                        .map((o) => (
                          <Button
                            key="gems"
                            variant="ghost"
                            disabled={!o.affordable}
                            onClick={() => launch(selected, "gems")}
                          >
                            <Gem className="size-4" /> {o.label}
                          </Button>
                        ))}
                      {availability.recommended === "locked" && !availability.freeAvailable && (
                        <p className="text-xs text-magenta">{availability.reason}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Boss Rush ladder */}
                {selected === "boss_rush" && (
                  <div className="mt-6">
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted">Boss ladder</p>
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
                )}
              </div>
            </div>
          </Panel>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
