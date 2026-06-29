"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles, MapPin, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SnapCard } from "@/components/snap/SnapCard";
import { snapFrameTier } from "@/components/snap/snapVisuals";
import { displayCard } from "@/components/snap/displayCard";
import { CurrencyChip } from "@/components/ui/CurrencyChip";
import { useSnapCardModal } from "@/store/snapCardModalStore";
import { useGameStore } from "@/store/gameStore";
import { SNAP_CARDS_BY_ID } from "@/data/snapCards";
import { snapUpgradePreview } from "@/lib/game/snapUpgrades";
import { upgradeCostFor } from "@/store/gameStore";
import { cardSynergies, cardStrongLocations, cardWeakLocations } from "@/lib/game/snap/cardGuide";

export function SnapCardDetailModal() {
  const cardId = useSnapCardModal((s) => s.cardId);
  const close = useSnapCardModal((s) => s.close);
  const save = useGameStore((s) => s.save);
  const upgradeCard = useGameStore((s) => s.upgradeCard);

  const def = cardId ? SNAP_CARDS_BY_ID[cardId] : null;
  if (!def) return null;

  const level = save.ownedCards[def.id]?.level ?? 1;
  const preview = snapUpgradePreview(def.id, level);
  const cost = upgradeCostFor(def.id, level);
  const synergies = cardSynergies(def.id);
  const strong = cardStrongLocations(def.id);
  const weak = cardWeakLocations(def.id);

  const canAfford = cost
    ? save.profile.coins >= cost.coins && save.profile.gems >= cost.gems
    : false;

  return (
    <AnimatePresence>
      {cardId && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-3xl p-5 max-w-lg w-full ring-1 ring-white/10 relative max-h-[90vh] overflow-y-auto"
          >
            <button onClick={close} className="absolute top-3 right-3 z-10 size-8 grid place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <X className="size-4" />
            </button>

            <div className="flex gap-4">
              <SnapCard card={displayCard(def, level)} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl font-bold">{def.name}</h2>
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-1 rounded-md bg-sky-500/20 text-sky-300 font-bold">Cost {displayCard(def, level).cost}</span>
                  <span className="text-xs px-2 py-1 rounded-md bg-amber-400/20 text-amber-300 font-bold">Power {displayCard(def, level).basePower}</span>
                  <span className="text-xs px-2 py-1 rounded-md bg-white/10 text-white/70 font-bold">L{level}</span>
                </div>
                <p className="text-sm text-white/85 mt-3">{def.abilityText}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted mt-1">{abilityLabel(def.abilityType)}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {def.tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted italic mt-3">&ldquo;{def.flavor}&rdquo;</p>

            {/* Upgrade preview — upgrades are cosmetic-only (frame, not stats). */}
            {preview && !preview.maxed && (
              <div className="mt-4 rounded-xl bg-black/30 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Lv {preview.current.level} · {snapFrameTier(preview.current.level).name} frame</span>
                  <ArrowRight className="size-4 text-lime" />
                  <span className="font-bold" style={{ color: snapFrameTier(preview.next.level).color }}>
                    Lv {preview.next.level} · {snapFrameTier(preview.next.level).name} frame
                  </span>
                </div>
                <p className="text-[11px] text-white/70 mt-1.5">
                  Cosmetic upgrade — unlocks the {snapFrameTier(preview.next.level).name} frame. Energy &amp; Strength are unchanged.
                </p>
                {cost && (
                  <div className="flex items-center gap-2 mt-2">
                    {cost.coins > 0 && <CurrencyChip kind="coins" value={cost.coins} />}
                    {cost.gems > 0 && <CurrencyChip kind="gems" value={cost.gems} />}
                    <Button size="sm" className="ml-auto" disabled={!canAfford} onClick={() => upgradeCard(def.id)}>
                      Upgrade
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Guide */}
            <div className="mt-4 grid gap-2 text-xs">
              {synergies.length > 0 && (
                <Guide icon={<Sparkles className="size-3.5 text-lime" />} label="Best with" items={synergies} />
              )}
              {strong.length > 0 && (
                <Guide icon={<MapPin className="size-3.5 text-emerald-400" />} label="Strong at" items={strong} />
              )}
              {weak.length > 0 && (
                <Guide icon={<Swords className="size-3.5 text-red-400" />} label="Weak at" items={weak} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Guide({ icon, label, items }: { icon: React.ReactNode; label: string; items: string[] }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <div>
        <span className="text-muted">{label}: </span>
        <span className="text-white/80">{items.join(", ")}</span>
      </div>
    </div>
  );
}

function abilityLabel(type: string): string {
  switch (type) {
    case "on_reveal": return "On Reveal ability";
    case "ongoing": return "Ongoing ability";
    case "end_game": return "End of Game ability";
    case "conditional": return "Conditional ability";
    default: return "No ability";
  }
}

