import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { SnapMatchState } from "@/types/snap";

/**
 * Client wrapper for the guest PvP backend (migration 0007 + pvp-matchmake /
 * pvp-submit-turn Edge Functions + Supabase Realtime). No login: a stable guest
 * id (the local `guest_xxx` profile id) identifies the player. Everything no-ops
 * safely when Supabase isn't configured.
 */
export interface PvpDeckCard {
  cardId: string;
  level: number;
}

export interface PvpMatch {
  id: string;
  seed: string;
  player_a: string;
  player_b: string;
  username_a: string;
  username_b: string;
  deck_a: PvpDeckCard[];
  deck_b: PvpDeckCard[];
  status: "active" | "complete" | "abandoned";
  current_turn: number;
  max_turns: number;
  /** Canonical SnapMatchState snapshot (player A = "player" side). */
  state: SnapMatchState | null;
  result: "player_a" | "player_b" | "draw" | null;
  winner: string | null;
}

export interface PvpTurnAction {
  instanceId: string;
  locationId: string;
  orderIndex: number;
}

/** True when a real Supabase backend is configured (PvP needs it). */
export function pvpAvailable(): boolean {
  return !!getSupabaseBrowser();
}

/** Join the queue. Returns a match immediately if an opponent was waiting. */
export async function joinQueue(
  guestId: string,
  username: string,
  deck: PvpDeckCard[],
): Promise<{ matched: boolean; match?: PvpMatch }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { matched: false };
  const { data, error } = await supabase.functions.invoke("pvp-matchmake", {
    body: { guest_id: guestId, username, deck },
  });
  if (error || !data) return { matched: false };
  return data as { matched: boolean; match?: PvpMatch };
}

/** Cancel our queue entry (best-effort). */
export async function cancelQueue(guestId: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  await supabase.from("pvp_queue").update({ status: "cancelled" }).eq("guest_id", guestId);
}

/** Submit this player's staged plays for the current turn. */
export async function submitTurn(
  matchId: string,
  guestId: string,
  turn: number,
  actions: PvpTurnAction[],
): Promise<{ ok: boolean; bothSubmitted: boolean; currentTurn: number; status: string } | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("pvp-submit-turn", {
    body: { match_id: matchId, guest_id: guestId, turn, actions },
  });
  if (error || !data) return null;
  return data as { ok: boolean; bothSubmitted: boolean; currentTurn: number; status: string };
}

/** Fetch a match row by id. */
export async function fetchMatch(matchId: string): Promise<PvpMatch | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;
  const { data } = await supabase.from("pvp_matches").select("*").eq("id", matchId).maybeSingle();
  return (data as PvpMatch | null) ?? null;
}

/**
 * Subscribe to authoritative match updates (turn advances, completion) via
 * Supabase Realtime. Returns an unsubscribe function.
 */
export function subscribeMatch(matchId: string, onChange: (m: PvpMatch) => void): () => void {
  const supabase = getSupabaseBrowser();
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`pvp_match_${matchId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "pvp_matches", filter: `id=eq.${matchId}` },
      (payload) => onChange(payload.new as PvpMatch),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
