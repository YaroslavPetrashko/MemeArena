// pvp-matchmake (guest)
//
// MVP matchmaking with NO login: the client passes a stable guest id. Enqueue,
// and if another guest is waiting, pair them into a match and seed its turn-1
// board (createPvpMatch). Lichess-style "click and wait" — the client polls this
// until `matched` is true (or subscribes to its queue row).
//
// Input:  { guest_id, username, deck: [{cardId, level}] }
// Output: { matched: true, match } | { matched: false, queued: true }
//
// NOTE (production): pairing is best-effort select+update; under load use
// `select ... for update skip locked`. Guest ids are spoofable — add real auth
// before production. Writes here run as the service role (bypass RLS).
import { json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import { createPvpMatch } from "../_shared/snap/snapEngine.ts";

const MIN_DECK = 6;
const MAX_DECK = 12;

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const body = await req.json().catch(() => ({}));
    const guestId: string = body.guest_id;
    const username: string = (body.username ?? "Guest").slice(0, 24);
    const deck = Array.isArray(body.deck) ? body.deck : [];
    if (!guestId) return json({ error: "missing_guest_id" }, 400);
    if (deck.length < MIN_DECK || deck.length > MAX_DECK) return json({ error: "invalid_deck" }, 400);

    const admin = getAdminClient();

    // Already matched from a previous poll? Return that match.
    const { data: existing } = await admin
      .from("pvp_queue")
      .select("status, match_id")
      .eq("guest_id", guestId)
      .maybeSingle();
    if (existing?.status === "matched" && existing.match_id) {
      const { data: match } = await admin.from("pvp_matches").select("*").eq("id", existing.match_id).maybeSingle();
      return json({ matched: true, match });
    }

    // Upsert our waiting entry.
    await admin
      .from("pvp_queue")
      .upsert(
        { guest_id: guestId, username, deck, status: "waiting", match_id: null },
        { onConflict: "guest_id" },
      );

    // Oldest other guest waiting.
    const { data: opponent } = await admin
      .from("pvp_queue")
      .select("guest_id, username, deck")
      .eq("status", "waiting")
      .neq("guest_id", guestId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!opponent) return json({ matched: false, queued: true });

    // Pair: opponent = player A (was waiting first), caller = player B.
    const matchId = crypto.randomUUID();
    const seed = `pvp-${matchId}`;
    const state = createPvpMatch({
      matchId,
      seed,
      deckA: opponent.deck,
      deckB: deck,
      profileIdA: opponent.guest_id,
      profileIdB: guestId,
    });

    const { data: match, error: matchErr } = await admin
      .from("pvp_matches")
      .insert({
        id: matchId,
        seed,
        player_a: opponent.guest_id,
        player_b: guestId,
        username_a: opponent.username,
        username_b: username,
        deck_a: opponent.deck,
        deck_b: deck,
        status: "active",
        current_turn: 1,
        max_turns: 6,
        state,
      })
      .select("*")
      .single();
    if (matchErr || !match) return json({ matched: false, queued: true });

    await admin
      .from("pvp_queue")
      .update({ status: "matched", match_id: matchId })
      .in("guest_id", [guestId, opponent.guest_id]);

    return json({ matched: true, match });
  } catch (e) {
    return json({ error: "matchmake_failed", detail: String(e) }, 500);
  }
});
