// submit-battle-result
// Input: { mode, boss_id, result, score, turns, damage_dealt, remaining_hp,
//          combos_triggered, deck_snapshot, action_log, battle_seed, wave,
//          entry_type }
//
// Validates the battle, applies Coins/XP/Shards/Arena Ticket rewards, computes
// the PENDING MEMEARENA reward (never trusts a client-sent token amount),
// writes the reward_ledger, and updates leaderboards + daily limits.
import { json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient, getCallerUser } from "../_shared/supabaseAdmin.ts";
import {
  CAPS,
  DIMINISHING,
  computeFinalReward,
  isBattlePlausible,
} from "../_shared/economy.ts";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const body = await req.json();
    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "unauthenticated" }, 401);

    const admin = getAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", caller.id)
      .maybeSingle();
    if (!profile) return json({ error: "no_profile" }, 400);

    // --- Validate boss exists / mode availability ---
    const { data: boss } = await admin
      .from("bosses")
      .select("*")
      .eq("id", body.boss_id)
      .maybeSingle();
    const bossMaxHp = boss?.max_hp ?? 9999;

    let validation: "approved" | "review" | "rejected" = "approved";
    const plausible = isBattlePlausible({
      turns: body.turns ?? 0,
      damage_dealt: body.damage_dealt ?? 0,
      bossMaxHp,
      result: body.result,
    });
    if (!plausible) validation = "review";

    // --- Persist battle ---
    const { data: battle } = await admin
      .from("battles")
      .insert({
        profile_id: profile.id,
        mode: "arena",
        boss_id: body.boss_id,
        deck_snapshot: body.deck_snapshot ?? [],
        battle_seed: body.battle_seed ?? null,
        action_log: body.action_log ?? [],
        result: body.result,
        score: body.score ?? 0,
        turns: body.turns ?? 0,
        damage_dealt: body.damage_dealt ?? 0,
        remaining_hp: body.remaining_hp ?? 0,
        combos_triggered: body.combos_triggered ?? [],
        validation_status: validation,
      })
      .select("id")
      .single();

    // --- Daily limits row ---
    const date = todayKey();
    const { data: limitsRow } = await admin
      .from("daily_limits")
      .upsert({ profile_id: profile.id, date }, { onConflict: "profile_id,date" })
      .select("*")
      .single();

    const won = body.result === "win";

    // --- Non-token currency rewards (read boss rewards_config if present) ---
    const rc = boss?.rewards_config ?? {};
    const coins = won ? Math.round((rc.coins?.[0] ?? 30) + Math.random() * ((rc.coins?.[1] ?? 60) - (rc.coins?.[0] ?? 30))) : 10;
    const xp = won ? rc.xp ?? 30 : 8;
    const shards = won ? Math.round((rc.shards?.[0] ?? 1)) : 0;
    let tickets = 0;
    if (won && Math.random() < (rc.ticketChance ?? 0.15)) tickets = 1;

    // --- Pending MEMEARENA reward (server-authoritative) ---
    const walletConnected = !!profile.wallet_address;
    const modeDailyKey = "arena_rewards";
    const modeUsed = Number(limitsRow?.[modeDailyKey] ?? 0);
    const totalUsed = Number(limitsRow?.total_rewards ?? 0);

    const modeCap = CAPS.modeDaily.arena ?? 25;
    const modeRemaining = Math.max(0, modeCap - modeUsed);
    const walletDailyRemaining = Math.max(0, CAPS.walletDaily - totalUsed);

    let memearena = 0;
    let reason = "ok";

    if (!won) reason = "loss";
    else if (!walletConnected) reason = "guest_no_wallet";
    else if (validation !== "approved") reason = "under_review";
    else {
      const diffMult = typeof boss?.difficulty === "number" ? 0.8 + boss.difficulty * 0.18 : 1.6;
      const easyWins = modeUsed > 0 ? 6 : 0; // simplistic easy-win proxy
      const antiFarm =
        easyWins > DIMINISHING.easyWinThreshold
          ? Math.max(DIMINISHING.minMultiplier, 1 - (easyWins - DIMINISHING.easyWinThreshold) * DIMINISHING.decayPerWin)
          : 1;

      const base = ((rc.memearenaMin ?? 1) + (rc.memearenaMax ?? 4)) / 2;
      memearena = computeFinalReward({
        baseReward: base,
        difficultyMultiplier: diffMult,
        scoreMultiplier: 1 + Math.min(1.5, (body.score ?? 0) / 3000),
        comboBonus: (body.combos_triggered?.length ?? 0) * 0.5,
        remainingHpBonus: 1 + Math.max(0, (body.remaining_hp ?? 0) / 30) * 0.3,
        turnEfficiencyBonus: (body.turns ?? 99) <= 7 ? 1.2 : 1,
        entryTypeModifier: body.entry_type === "free" ? 1 : 1.05,
        antiFarmModifier: antiFarm,
        dailyCapRemaining: walletDailyRemaining,
        weeklyCapRemaining: CAPS.walletWeekly,
        modeDailyCapRemaining: modeRemaining,
      });
      // Clamp to boss band.
      memearena = Math.max(rc.memearenaMin ?? 0, Math.min(memearena, rc.memearenaMax ?? memearena));
      memearena = Math.min(memearena, walletDailyRemaining, modeRemaining);
      memearena = Math.round(memearena * 100) / 100;
      if (memearena <= 0) reason = "cap_reached";
    }

    // --- Write reward_ledger entries ---
    const ledgerInserts = [] as Array<Record<string, unknown>>;
    if (memearena > 0) {
      ledgerInserts.push({
        profile_id: profile.id,
        battle_id: battle?.id ?? null,
        reward_type: "battle",
        currency: "MEMEARENA",
        amount: memearena,
        status: validation === "approved" ? "approved" : "review",
        reason,
        approved_at: validation === "approved" ? new Date().toISOString() : null,
        metadata: { mode: "arena", boss_id: body.boss_id, score: body.score },
      });
    }
    if (ledgerInserts.length) await admin.from("reward_ledger").insert(ledgerInserts);

    // --- Apply non-token currency to profile ---
    await admin
      .from("profiles")
      .update({
        coins: (profile.coins ?? 0) + coins,
        xp: (profile.xp ?? 0) + xp,
        shards: (profile.shards ?? 0) + shards,
        arena_tickets: (profile.arena_tickets ?? 0) + tickets,
        player_level: Math.max(profile.player_level, 1 + Math.floor(((profile.xp ?? 0) + xp) / 200)),
      })
      .eq("id", profile.id);

    // --- Update daily limits ---
    await admin
      .from("daily_limits")
      .update({
        [modeDailyKey]: modeUsed + memearena,
        total_rewards: totalUsed + memearena,
      })
      .eq("profile_id", profile.id)
      .eq("date", date);

    // --- Leaderboards (weekly) ---
    if (won && body.score > 0) {
      await admin.from("leaderboard_entries").insert({
        profile_id: profile.id,
        mode: "arena",
        period: "weekly",
        score: body.score,
        metadata: { memearena },
      });
    }

    return json({
      ok: true,
      validation,
      reward: { coins, xp, shards, tickets, memearena },
      tokenReason: reason,
      battle_id: battle?.id,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
