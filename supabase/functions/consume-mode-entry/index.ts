// consume-mode-entry
// Input:  { mode, method }  (method: "free" | "ticket" | "gems")
// Checks free-entry availability; otherwise charges Arena Tickets or Gems.
// Records a mode_entries row and returns the granted entry.
import { json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient, getCallerUser } from "../_shared/supabaseAdmin.ts";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Keep in sync with /src/data/modes.ts
const MODE_CONFIG: Record<string, { freePerDay: number; tickets?: number; gems?: number; unlockLevel: number }> = {
  arena: { freePerDay: Infinity, unlockLevel: 1 },
};

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const { mode, method } = await req.json();
    const cfg = MODE_CONFIG[mode];
    if (!cfg) return json({ error: "invalid_mode" }, 400);

    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "unauthenticated" }, 401);

    const admin = getAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", caller.id)
      .maybeSingle();
    if (!profile) return json({ error: "no_profile" }, 400);

    if (profile.player_level < cfg.unlockLevel) {
      return json({ error: "mode_locked", required_level: cfg.unlockLevel }, 403);
    }

    // Arena is free + unlimited; no daily caps or currency cost to consume.
    const { data: entry } = await admin
      .from("mode_entries")
      .insert({
        profile_id: profile.id,
        mode: "arena",
        entry_type: "free",
        cost_currency: null,
        cost_amount: 0,
        status: "granted",
      })
      .select("id")
      .single();

    return json({ ok: true, entry_id: entry?.id, entry_type: "free", cost_currency: null, cost_amount: 0 });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
