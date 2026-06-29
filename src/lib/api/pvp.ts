import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Client wrapper for the PvP turn-submit backend (migration 0006 +
 * pvp-matchmake / pvp-submit-turn Edge Functions). All of these no-op safely
 * when Supabase isn't configured, so guest/local mode stays unaffected.
 */
export interface PvpMatch {
  id: string;
  mode: string;
  seed: string;
  player_a: string;
  player_b: string;
  deck_a: string[];
  deck_b: string[];
  status: "active" | "complete" | "abandoned";
  current_turn: number;
  max_turns: number;
  state: unknown;
  result: "player_a" | "player_b" | "draw" | null;
  winner: string | null;
}

export interface PvpTurnAction {
  cardId: string;
  locationId: string;
  orderIndex: number;
}

export interface SubmitTurnResult {
  ok: boolean;
  bothSubmitted: boolean;
  currentTurn: number;
  status: string;
}

/** Join the matchmaking queue. Returns a match immediately if one was waiting. */
export async function joinQueue(
  deck: string[],
  mode = "arena",
): Promise<{ matched: boolean; match?: PvpMatch }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { matched: false };
  const { data, error } = await supabase.functions.invoke("pvp-matchmake", { body: { deck, mode } });
  if (error || !data) return { matched: false };
  return data as { matched: boolean; match?: PvpMatch };
}

/** Cancel our queue entry (RLS allows updating our own row). */
export async function leaveQueue(): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return;
  await supabase.from("pvp_queue").update({ status: "cancelled" }).eq("profile_id", uid);
}

/** Fetch the caller's current active match, if any. */
export async function getActiveMatch(): Promise<PvpMatch | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;
  const { data } = await supabase
    .from("pvp_matches")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as PvpMatch | null) ?? null;
}

/** Submit this player's staged plays for the current turn. */
export async function submitTurn(
  matchId: string,
  turn: number,
  actions: PvpTurnAction[],
): Promise<SubmitTurnResult | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("pvp-submit-turn", {
    body: { match_id: matchId, turn, actions },
  });
  if (error || !data) return null;
  return data as SubmitTurnResult;
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
