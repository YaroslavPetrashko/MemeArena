"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { SnapMatchState } from "@/types/snap";

/**
 * Best-effort submission of a finished SNAP match to the authoritative replay
 * Edge Function (submit-snap-result). The server re-runs the deterministic
 * engine from the seed + deck snapshot + action log and is the source of truth
 * for MEMEARENA rewards — the client result is never trusted for tokens.
 *
 * When Supabase isn't configured (guest/offline) this is a no-op; the local
 * store already mirrors non-token rewards optimistically.
 */
export async function submitSnapResult(
  match: SnapMatchState,
  opts: { entryType: "free" | "gems"; score: number },
): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    // The server replays from the ORIGINAL deck snapshot captured at creation,
    // so the seeded shuffle reproduces identically.
    const deckSnapshot = match.initialDeck;

    await supabase.functions.invoke("submit-snap-result", {
      body: {
        match_id: match.matchId,
        mode: match.mode,
        boss_id: match.bossId,
        seed: match.seed,
        deck_snapshot: deckSnapshot,
        action_log: match.actionLog,
        entry_type: opts.entryType,
        // Client-claimed result (server recomputes; used only for mismatch flag).
        claimed_result: match.scoring?.result,
        claimed_score: opts.score,
      },
    });
  } catch {
    // Non-fatal: local mirror already applied; server reconciliation can retry.
  }
}
