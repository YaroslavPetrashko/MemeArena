// pvp-submit-turn (guest)
//
// A guest submits their staged plays for the current turn. When BOTH players
// have submitted, the match is resolved AUTHORITATIVELY by replaying every turn
// from the seed with the shared deterministic engine (createPvpMatch +
// resolvePvpTurn), then the new board snapshot + turn/result are written. Both
// clients pick up the change via Realtime on the pvp_matches row.
//
// Input:  { match_id, guest_id, turn, actions: [{instanceId, locationId, orderIndex}] }
// Output: { ok, bothSubmitted, currentTurn, status }
import { json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import { createPvpMatch, resolvePvpTurn, type PvpTurnAction } from "../_shared/snap/snapEngine.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const body = await req.json().catch(() => ({}));
    const matchId: string = body.match_id;
    const guestId: string = body.guest_id;
    const turn: number = body.turn;
    const actions: PvpTurnAction[] = Array.isArray(body.actions) ? body.actions : [];
    if (!matchId || !guestId || !Number.isInteger(turn)) return json({ error: "bad_request" }, 400);

    const admin = getAdminClient();

    const { data: match } = await admin.from("pvp_matches").select("*").eq("id", matchId).maybeSingle();
    if (!match) return json({ error: "no_match" }, 404);
    if (match.player_a !== guestId && match.player_b !== guestId) return json({ error: "not_a_participant" }, 403);
    if (match.status !== "active") return json({ error: "match_not_active" }, 409);
    if (turn !== match.current_turn) return json({ error: "stale_turn" }, 409);

    // Record (or replace) this player's submission for the turn.
    await admin
      .from("pvp_match_turns")
      .upsert(
        { match_id: matchId, turn, guest_id: guestId, actions },
        { onConflict: "match_id,turn,guest_id" },
      );

    // All turns so far (for both the "both submitted?" check and the replay).
    const { data: turnRows } = await admin
      .from("pvp_match_turns")
      .select("turn, guest_id, actions")
      .eq("match_id", matchId);
    const rows = turnRows ?? [];

    const submittedThisTurn = new Set(rows.filter((r) => r.turn === turn).map((r) => r.guest_id));
    const bothSubmitted = submittedThisTurn.has(match.player_a) && submittedThisTurn.has(match.player_b);
    if (!bothSubmitted) {
      return json({ ok: true, bothSubmitted: false, currentTurn: match.current_turn, status: match.status });
    }

    // Deterministic replay of every turn up to `turn`.
    const byTurn = new Map<number, { a: PvpTurnAction[]; b: PvpTurnAction[] }>();
    for (const r of rows) {
      const e = byTurn.get(r.turn) ?? { a: [], b: [] };
      if (r.guest_id === match.player_a) e.a = r.actions ?? [];
      else if (r.guest_id === match.player_b) e.b = r.actions ?? [];
      byTurn.set(r.turn, e);
    }

    let state = createPvpMatch({
      matchId,
      seed: match.seed,
      deckA: match.deck_a,
      deckB: match.deck_b,
      profileIdA: match.player_a,
      profileIdB: match.player_b,
    });
    for (let t = 1; t <= turn; t++) {
      const e = byTurn.get(t) ?? { a: [], b: [] };
      state = resolvePvpTurn(state, e.a, e.b);
    }

    const complete = state.status === "complete";
    // scoring.result is from player A's ("player") perspective.
    const result = state.scoring?.result;
    const update: Record<string, unknown> = {
      state,
      current_turn: state.turn,
      updated_at: new Date().toISOString(),
      status: complete ? "complete" : "active",
    };
    if (complete) {
      update.result = result === "win" ? "player_a" : result === "loss" ? "player_b" : "draw";
      update.winner = result === "win" ? match.player_a : result === "loss" ? match.player_b : null;
    }
    await admin.from("pvp_matches").update(update).eq("id", matchId);

    return json({
      ok: true,
      bothSubmitted: true,
      currentTurn: state.turn,
      status: complete ? "complete" : "active",
    });
  } catch (e) {
    return json({ error: "submit_failed", detail: String(e) }, 500);
  }
});
