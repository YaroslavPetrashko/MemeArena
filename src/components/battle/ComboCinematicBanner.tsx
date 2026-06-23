"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ActiveCombo } from "@/types/arena";
import { ARENA_COMBOS_BY_ID } from "@/data/arenaCombos";
import { COMBO_PALETTE, tokenGradient, cardInitials } from "./arenaVisuals";
import { getCard } from "@/data/cards";

/** Big cinematic combo moment: name, shockwave, and the cards involved. */
export function ComboCinematicBanner({ combos }: { combos: ActiveCombo[] }) {
  const showing = combos.filter((c) => c.bannerRemaining > 0).slice(0, 1);
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <AnimatePresence>
        {showing.map((c) => {
          const def = ARENA_COMBOS_BY_ID[c.id];
          const pal = COMBO_PALETTE[c.palette] ?? COMBO_PALETTE.gold;
          const cards = (def?.trigger && "cardIds" in def.trigger ? def.trigger.cardIds : c.cardIds).filter(Boolean);
          return (
            <motion.div
              key={c.id}
              initial={{ scale: 0.5, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="flex flex-col items-center gap-2"
            >
              {/* shockwave */}
              <motion.div
                className="absolute rounded-full"
                initial={{ width: 0, height: 0, opacity: 0.6 }}
                animate={{ width: 520, height: 520, opacity: 0 }}
                transition={{ duration: 1.1 }}
                style={{ border: `3px solid ${pal.text}`, boxShadow: `0 0 60px ${pal.glow}` }}
              />
              <div
                className="rounded-2xl border-2 px-7 py-3 text-center backdrop-blur-sm"
                style={{ borderColor: pal.text, background: "rgba(0,0,0,0.6)", boxShadow: `0 0 50px ${pal.glow}` }}
              >
                <p className="font-display text-3xl font-extrabold tracking-tight" style={{ color: pal.text, textShadow: `0 0 20px ${pal.glow}` }}>
                  {c.name}
                </p>
              </div>
              {/* card chips */}
              <div className="flex gap-1.5">
                {cards.map((id) => {
                  const card = getCard(id);
                  return (
                    <div
                      key={id}
                      className="grid size-7 place-items-center overflow-hidden rounded-full border"
                      style={{ background: tokenGradient(id), borderColor: pal.text }}
                    >
                      <span className="text-[9px] font-bold text-white/90">{card ? cardInitials(id, card.name) : "?"}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
