// pvp-submit-turn
//
// Turn-submit PvP: a player submits their staged plays for the current turn.
// When BOTH players have submitted for that turn, the turn is resolved with the
// shared authoritative SNAP engine (see _shared/snap) and the match advances.
//
// Input:  { match_id, turn, actions: [{ cardId, locationId, orderIndex }] }
// Output: { ok, bothSubmitted, currentTurn, status }
import { json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient, getCallerUser } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const matchId: string = body.match_id;
    const turn: number = body.turn;
    const actions = Array.isArray(body.actions) ? body.actions : [];
    if (!matchId || !Number.isInteger(turn)) return json({ error: "bad_request" }, 400);

    const admin = getAdminClient();

    // Verify the caller is a participant and the turn is current.
    const { data: match } = await admin
      .from("pvp_matches")
      .select("*")
      .eq("id", matchId)
      .maybeSingle();
    if (!match) return json({ error: "no_match" }, 404);
    if (match.player_a !== caller.id && match.player_b !== caller.id) {
      return json({ error: "not_a_participant" }, 403);
    }
    if (match.status !== "active") return json({ error: "match_not_active" }, 409);
    if (turn !== match.current_turn) return json({ error: "stale_turn" }, 409);

    // Record (or replace) this player's submission for the turn.
    await admin
      .from("pvp_match_turns")
      .upsert(
        { match_id: matchId, turn, profile_id: caller.id, actions },
        { onConflict: "match_id,turn,profile_id" },
      );

    // Both submitted?
    const { data: turnRows } = await admin
      .from("pvp_match_turns")
      .select("profile_id, actions")
      .eq("match_id", matchId)
      .eq("turn", turn);
    const submitters = new Set((turnRows ?? []).map((r) => r.profile_id));
    const bothSubmitted = submitters.has(match.player_a) && submitters.has(match.player_b);

    if (!bothSubmitted) {
      return json({ ok: true, bothSubmitted: false, currentTurn: match.current_turn, status: match.status });
    }

    // --- TODO: authoritative turn resolution ---
    // Replay this turn through a two-player SNAP engine variant (the current
    // engine in _shared/snap is bot-vs-player; PvP needs a createPvpMatch that
    // seats two real decks). Feed both players' `actions`, recompute the board,
    // and persist the snapshot in pvp_matches.state. Until that lands, we simply
    // advance the turn counter so the loop is exercisable end-to-end.
    const isFinalTurn = match.current_turn >= match.max_turns;
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      current_turn: isFinalTurn ? match.current_turn : match.current_turn + 1,
    };
    if (isFinalTurn) {
      update.status = "complete";
      // TODO: set result/winner from the resolved final board state.
    }
    await admin.from("pvp_matches").update(update).eq("id", matchId);

    return json({
      ok: true,
      bothSubmitted: true,
      currentTurn: update.current_turn,
      status: isFinalTurn ? "complete" : "active",
    });
  } catch (e) {
    return json({ error: "submit_failed", detail: String(e) }, 500);
  }
});
