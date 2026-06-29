// pvp-matchmake
//
// Join the PvP matchmaking queue and, if an opponent is already waiting, pair
// them into a match. Turn-submit model: matches are resolved per-turn by
// pvp-submit-turn using the shared authoritative SNAP engine.
//
// Input:  { deck: string[], mode?: "arena" }
// Output: { matched: true, match } | { matched: false, queued: true }
//
// NOTE (production): pairing here is a best-effort select+update. Under load this
// should use `select ... for update skip locked` in a SQL function / RPC to avoid
// double-pairing races. Kept simple for the scaffold.
import { json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient, getCallerUser } from "../_shared/supabaseAdmin.ts";

const DECK_SIZE = 12;

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const mode: string = body.mode ?? "arena";
    const deck: string[] = Array.isArray(body.deck) ? body.deck : [];
    if (deck.length !== DECK_SIZE) return json({ error: "invalid_deck" }, 400);

    const admin = getAdminClient();

    // Already matched from a previous poll? Return that match.
    const { data: existing } = await admin
      .from("pvp_queue")
      .select("status, match_id")
      .eq("profile_id", caller.id)
      .maybeSingle();
    if (existing?.status === "matched" && existing.match_id) {
      const { data: match } = await admin
        .from("pvp_matches")
        .select("*")
        .eq("id", existing.match_id)
        .maybeSingle();
      return json({ matched: true, match });
    }

    // Upsert our waiting entry (one per player via unique(profile_id)).
    await admin
      .from("pvp_queue")
      .upsert(
        { profile_id: caller.id, mode, deck, status: "waiting", match_id: null },
        { onConflict: "profile_id" },
      );

    // Look for the oldest other player waiting in the same mode.
    const { data: opponent } = await admin
      .from("pvp_queue")
      .select("profile_id, deck")
      .eq("status", "waiting")
      .eq("mode", mode)
      .neq("profile_id", caller.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!opponent) return json({ matched: false, queued: true });

    // Create the match (opponent = player_a, caller = player_b) and mark both
    // queue entries matched.
    const seed = `pvp-${crypto.randomUUID()}`;
    const { data: match, error: matchErr } = await admin
      .from("pvp_matches")
      .insert({
        mode,
        seed,
        player_a: opponent.profile_id,
        player_b: caller.id,
        deck_a: opponent.deck,
        deck_b: deck,
        status: "active",
        current_turn: 1,
        max_turns: 6,
      })
      .select("*")
      .single();
    if (matchErr || !match) return json({ matched: false, queued: true });

    await admin
      .from("pvp_queue")
      .update({ status: "matched", match_id: match.id })
      .in("profile_id", [caller.id, opponent.profile_id]);

    return json({ matched: true, match });
  } catch (e) {
    return json({ error: "matchmake_failed", detail: String(e) }, 500);
  }
});
