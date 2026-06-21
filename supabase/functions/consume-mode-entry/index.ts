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
  boss_rush: { freePerDay: Infinity, unlockLevel: 1 },
  daily_boss: { freePerDay: 1, tickets: 1, gems: 25, unlockLevel: 1 },
  survival: { freePerDay: 3, tickets: 1, gems: 15, unlockLevel: 2 },
  limited_event: { freePerDay: 0, tickets: 3, gems: 75, unlockLevel: 3 },
  high_roller: { freePerDay: 0, tickets: 10, gems: 250, unlockLevel: 8 },
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

    const date = todayKey();
    const { data: limits } = await admin
      .from("daily_limits")
      .upsert({ profile_id: profile.id, date }, { onConflict: "profile_id,date" })
      .select("*")
      .single();

    const freeBossUsed = limits?.free_daily_boss_used ?? false;
    const survivalUsed = limits?.free_survival_runs_used ?? 0;

    let freeAvailable = false;
    if (cfg.freePerDay === Infinity) freeAvailable = true;
    else if (mode === "daily_boss") freeAvailable = !freeBossUsed;
    else if (mode === "survival") freeAvailable = survivalUsed < cfg.freePerDay;

    let entryType = method as string;
    let costCurrency: string | null = null;
    let costAmount = 0;

    if (freeAvailable && (method === "free" || !method)) {
      entryType = "free";
      // Consume the free entry.
      if (mode === "daily_boss") {
        await admin.from("daily_limits").update({ free_daily_boss_used: true }).eq("profile_id", profile.id).eq("date", date);
      } else if (mode === "survival") {
        await admin.from("daily_limits").update({ free_survival_runs_used: survivalUsed + 1 }).eq("profile_id", profile.id).eq("date", date);
      }
    } else if (method === "ticket" && cfg.tickets) {
      if (profile.arena_tickets < cfg.tickets) return json({ error: "insufficient_tickets" }, 402);
      costCurrency = "tickets";
      costAmount = cfg.tickets;
      await admin.from("profiles").update({ arena_tickets: profile.arena_tickets - cfg.tickets }).eq("id", profile.id);
    } else if (method === "gems" && cfg.gems) {
      if (profile.gems < cfg.gems) return json({ error: "insufficient_gems" }, 402);
      costCurrency = "gems";
      costAmount = cfg.gems;
      await admin.from("profiles").update({ gems: profile.gems - cfg.gems }).eq("id", profile.id);
    } else {
      return json({ error: "no_valid_entry_method" }, 400);
    }

    const { data: entry } = await admin
      .from("mode_entries")
      .insert({
        profile_id: profile.id,
        mode,
        entry_type: entryType,
        cost_currency: costCurrency,
        cost_amount: costAmount,
        status: "granted",
      })
      .select("id")
      .single();

    return json({ ok: true, entry_id: entry?.id, entry_type: entryType, cost_currency: costCurrency, cost_amount: costAmount });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
