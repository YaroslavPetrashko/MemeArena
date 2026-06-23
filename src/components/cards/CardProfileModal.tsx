"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Crosshair, Gauge, Target } from "lucide-react";
import { useCardModal } from "@/store/cardModalStore";
import { useGameStore, upgradeCostFor } from "@/store/gameStore";
import { getCard } from "@/data/cards";
import { resolveArenaProfile } from "@/lib/game/cardOvr";
import { RarityBadge, Badge } from "@/components/ui/Badge";
import { CardStatBars } from "./CardStatBars";
import { CardAbilityPanel } from "./CardAbilityPanel";
import { CardUpgradePreview } from "./CardUpgradePreview";
import { tokenGradient, rarityRing, rarityGlowColor, cardInitials } from "@/components/battle/arenaVisuals";

type Tab = "overview" | "abilities" | "upgrades" | "synergies";

/** Premium FIFA-style card profile. Mounted once globally (see Providers). */
export function CardProfileModal() {
  const cardId = useCardModal((s) => s.cardId);
  const close = useCardModal((s) => s.close);
  const save = useGameStore((s) => s.save);
  const upgradeCard = useGameStore((s) => s.upgradeCard);

  const [tab, setTab] = useState<Tab>("overview");
  const [previewMax, setPreviewMax] = useState(false);

  useEffect(() => {
    if (cardId) { setTab("overview"); setPreviewMax(false); }
  }, [cardId]);

  // Close on Escape.
  useEffect(() => {
    if (!cardId) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cardId, close]);

  if (!cardId) return null;
  const card = getCard(cardId);
  if (!card) return null;

  const owned = save.ownedCards[cardId];
  const level = owned?.level ?? 1;
  const displayLevel = previewMax ? 5 : level;
  const profile = resolveArenaProfile(cardId, displayLevel);
  if (!profile) return null;

  const nextProfile = displayLevel < 5 ? resolveArenaProfile(cardId, displayLevel + 1) : null;
  const cost = upgradeCostFor(cardId, level);
  const ring = rarityRing[profile.rarity];
  const glow = rarityGlowColor[profile.rarity];

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border bg-surface sm:rounded-3xl"
          style={{ borderColor: ring, boxShadow: `0 0 60px ${glow}` }}
        >
          {/* header */}
          <div className="relative shrink-0 overflow-hidden p-4" style={{ background: tokenGradient(cardId) }}>
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
            <button onClick={close} className="absolute right-3 top-3 z-10 rounded-lg bg-black/40 p-1.5 text-white/80 hover:text-white">
              <X className="size-4" />
            </button>
            <div className="relative flex items-center gap-4">
              {/* avatar / token preview */}
              <motion.div
                className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl"
                style={{ boxShadow: `inset 0 0 0 3px ${ring}, 0 0 20px ${glow}` }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                {card.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_path} alt="" className="h-full w-full object-cover" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                ) : null}
                <span className="absolute font-display text-2xl font-bold text-white drop-shadow">{cardInitials(cardId, card.name)}</span>
              </motion.div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-xl font-bold drop-shadow sm:text-2xl">{card.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <RarityBadge rarity={profile.rarity} />
                  <Badge tone="neutral">{profile.unitType}</Badge>
                  <Badge tone="lime"><Zap className="size-3" /> {profile.deployCost}</Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-foreground/80">{profile.lore}</p>
              </div>

              {/* OVR */}
              <div className="shrink-0 text-center">
                <motion.p
                  key={profile.ovr}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-display text-4xl font-extrabold leading-none drop-shadow sm:text-5xl"
                  style={{ color: ring }}
                >
                  {profile.ovr}
                </motion.p>
                <p className="text-[10px] uppercase tracking-widest text-white/80">OVR · Lv{displayLevel}</p>
              </div>
            </div>
          </div>

          {/* tabs */}
          <div className="flex shrink-0 border-b border-white/10 px-2">
            {(["overview", "abilities", "upgrades", "synergies"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex-1 px-2 py-2.5 text-xs font-semibold capitalize transition-colors ${tab === t ? "text-lime" : "text-muted hover:text-foreground"}`}
              >
                {t}
                {tab === t && <motion.div layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-lime" />}
              </button>
            ))}
          </div>

          {/* body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "overview" && (
              <div className="space-y-4">
                <CardStatBars stats={profile.stats} nextStats={nextProfile?.stats ?? null} />
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <MetaTile icon={Target} label="Role" value={profile.role} />
                  <MetaTile icon={Crosshair} label="Target" value={profile.targetType} />
                  <MetaTile icon={Gauge} label="Type" value={profile.cardType} />
                  <MetaTile icon={Zap} label="Cost" value={String(profile.deployCost)} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-xs text-muted">Preview Level 5</span>
                  <button
                    onClick={() => setPreviewMax((v) => !v)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${previewMax ? "bg-lime" : "bg-white/15"}`}
                  >
                    <motion.span className="absolute top-0.5 size-4 rounded-full bg-white" animate={{ left: previewMax ? 18 : 2 }} />
                  </button>
                </div>
              </div>
            )}

            {tab === "abilities" && <CardAbilityPanel profile={profile} />}

            {tab === "upgrades" && (
              <CardUpgradePreview
                cardId={cardId}
                level={level}
                cost={cost}
                owned={!!owned}
                coins={save.profile.coins}
                shards={save.profile.shards}
                gems={save.profile.gems}
                canUpgrade={!!owned && level < 5}
                onUpgrade={() => upgradeCard(cardId)}
              />
            )}

            {tab === "synergies" && (
              <div className="space-y-2">
                <p className="text-xs text-muted">This card carries these synergy tags. Combine tagged cards in your deck to trigger arena combos.</p>
                <div className="flex flex-wrap gap-2">
                  {profile.synergyTags.length === 0 && <span className="text-xs text-muted">No synergy tags.</span>}
                  {profile.synergyTags.map((t) => (
                    <span key={t} className="rounded-full border border-magenta/30 bg-magenta/10 px-3 py-1 text-xs font-medium text-magenta">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MetaTile({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
      <div className="flex items-center gap-1 text-muted"><Icon className="size-3" /> <span className="text-[10px] uppercase">{label}</span></div>
      <p className="mt-0.5 truncate font-semibold capitalize">{value}</p>
    </div>
  );
}
