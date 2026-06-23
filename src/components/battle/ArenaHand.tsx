"use client";

import { motion } from "framer-motion";
import type { ArenaHandCard } from "@/types/arena";
import { getCard } from "@/data/cards";
import { tokenGradient, rarityRing, cardInitials } from "./arenaVisuals";
import { resolveArenaProfile } from "@/lib/game/cardOvr";

/**
 * Bottom hand — 4 active cards from the cycling deck. Playability states:
 * bright/glowing (affordable), dim (too costly), lifted (selected), and a
 * radial cooldown sweep while a card is on deploy cooldown.
 */
export function ArenaHand({
  hand,
  energy,
  selectedUid,
  onSelect,
  cycleCount,
}: {
  hand: ArenaHandCard[];
  energy: number;
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  cycleCount: number;
}) {
  return (
    <div className="flex items-end gap-2">
      {hand.map((c) => {
        const card = getCard(c.cardId);
        const profile = resolveArenaProfile(c.cardId, c.level);
        const affordable = energy >= c.cost && c.deployCooldown <= 0;
        const selected = selectedUid === c.uid;
        const cdFrac = c.deployCooldown > 0 ? c.deployCooldown / 700 : 0;
        return (
          <motion.button
            key={c.uid}
            layout
            onClick={() => onSelect(c.uid)}
            animate={{ y: selected ? -10 : 0, scale: selected ? 1.06 : 1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="relative flex-1 overflow-hidden rounded-xl border text-left"
            style={{
              borderColor: selected ? "#b6ff1b" : affordable ? rarityRing[card?.rarity ?? "Common"] : "rgba(255,255,255,0.12)",
              boxShadow: selected
                ? "0 0 20px rgba(182,255,27,0.7)"
                : affordable
                  ? `0 0 12px ${rarityRing[card?.rarity ?? "Common"]}55`
                  : "none",
              opacity: affordable ? 1 : 0.5,
              filter: affordable ? "none" : "grayscale(0.5)",
            }}
          >
            {/* avatar */}
            <div className="relative aspect-square w-full overflow-hidden" style={{ background: tokenGradient(c.cardId) }}>
              {card?.image_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.image_path} alt="" className="h-full w-full object-cover" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
              ) : null}
              <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-white/90 drop-shadow">
                {card ? cardInitials(c.cardId, card.name) : "?"}
              </span>
              {/* OVR */}
              {profile && (
                <span className="absolute right-1 top-1 rounded-md bg-black/70 px-1 text-[10px] font-bold leading-tight text-gold">
                  {profile.ovr}
                </span>
              )}
              {/* cost */}
              <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-gradient-to-b from-cyan-300 to-cyan-600 text-[11px] font-bold text-black shadow">
                {c.cost}
              </span>
              {/* deploy cooldown sweep */}
              {cdFrac > 0 && (
                <div className="absolute inset-0 bg-black/55" style={{ clipPath: `inset(0 0 ${(1 - cdFrac) * 100}% 0)` }} />
              )}
            </div>
            {/* name + level */}
            <div className="flex items-center justify-between gap-1 px-1.5 py-1">
              <span className="truncate text-[10px] font-semibold leading-tight">{card?.name ?? c.cardId}</span>
              <span className="shrink-0 text-[9px] text-gold">L{c.level}</span>
            </div>
          </motion.button>
        );
      })}
      {/* cycle preview */}
      <div className="hidden w-8 shrink-0 flex-col items-center justify-center gap-0.5 self-stretch rounded-xl border border-dashed border-white/12 text-muted sm:flex">
        <span className="text-[9px] uppercase">Next</span>
        <span className="text-sm font-bold">{cycleCount}</span>
      </div>
    </div>
  );
}
