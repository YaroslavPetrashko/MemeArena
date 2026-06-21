"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { BattleState } from "@/types";

/**
 * Best-effort server submission of a finished battle. When Supabase is
 * configured and the user is authenticated, this calls the submit-battle-result
 * Edge Function, which is the AUTHORITATIVE source for rewards in production.
 * Locally (guest/offline) the client store applies rewards optimistically.
 */
export async function submitBattleResult(
  battle: BattleState,
  opts: { score: number; entryType: "free" | "ticket" | "gems" },
): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    await supabase.functions.invoke("submit-battle-result", {
      body: {
        mode: battle.mode,
        boss_id: battle.bossId,
        result: battle.result,
        score: opts.score,
        turns: battle.turn,
        damage_dealt: battle.damageDealt,
        remaining_hp: battle.player.hp,
        combos_triggered: battle.combosTriggered,
        deck_snapshot: battle.player.deck.concat(battle.player.hand, battle.player.discard),
        action_log: battle.actionLog,
        battle_seed: battle.seed,
        wave: battle.wave,
        entry_type: opts.entryType,
      },
    });
  } catch {
    // Non-fatal: local rewards already applied; server reconciliation can retry.
  }
}
