// submit-snap-result
//
// Authoritative SNAP match validation. The client submits the match seed, the
// original deck snapshot, the boss id, the chosen locations are derived from the
// seed, and the ordered player action log. This function REPLAYS the match with
// the same deterministic engine the client used, recomputes the result + score
// + MEMEARENA reward server-side, and only then writes the reward ledger. The
// client's claimed result is used solely to flag mismatches — never trusted.
//
// Input: { match_id, mode, boss_id, seed, deck_snapshot, action_log,
//          entry_type, claimed_result?, claimed_score? }
import { json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient, getCallerUser } from "../_shared/supabaseAdmin.ts";
import { CAPS, DIMINISHING } from "../_shared/economy.ts";
import { replayMatch } from "../_shared/snap/replay.ts";
import { mapScoreToRewards } from "../_shared/snap/snapRewards.ts";
import { getSnapBoss, bossDifficultyValue } from "../_shared/snap/data_snapBosses.ts";

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

    const boss = getSnapBoss(body.boss_id);
    if (!boss) return json({ error: "unknown_boss" }, 400);

    // --- Authoritative replay ---
    let validation: "approved" | "review" | "rejected" = "approved";
    let final;
    try {
      final = replayMatch({
        matchId: body.match_id ?? "server",
        mode: "arena",
        bossId: body.boss_id,
        seed: body.seed,
        profileId: profile.id,
        deck: body.deck_snapshot ?? [],
        actions: body.action_log ?? [],
      });
    } catch (_e) {
      return json({ error: "replay_failed" }, 400);
    }

    const scoring = final.scoring;
    if (!scoring) return json({ error: "no_scoring" }, 400);

    // Flag (don't reject) if the client claimed a different result/score.
    if (body.claimed_result && body.claimed_result !== scoring.result) {
      validation = "review";
    }

    const date = todayKey();
    const { data: limitsRow } = await admin
      .from("daily_limits")
      .upsert({ profile_id: profile.id, date }, { onConflict: "profile_id,date" })
      .select("*")
      .single();

    const modeDailyKey = "arena_rewards";
    const modeUsed = Number(limitsRow?.[modeDailyKey] ?? 0);
    const totalUsed = Number(limitsRow?.total_rewards ?? 0);
    const modeCap = CAPS.modeDaily.arena ?? 25;
    const modeRemaining = Math.max(0, modeCap - modeUsed);
    const walletDailyRemaining = Math.max(0, CAPS.walletDaily - totalUsed);

    // Easy-win anti-farm.
    const easyWins = modeUsed > 0 ? 6 : 0;
    const antiFarm =
      easyWins > DIMINISHING.easyWinThreshold
        ? Math.max(DIMINISHING.minMultiplier, 1 - (easyWins - DIMINISHING.easyWinThreshold) * DIMINISHING.decayPerWin)
        : 1;

    // Recompute rewards from the SERVER's scoring (never the client's).
    const reward = mapScoreToRewards(scoring, {
      mode: "arena",
      difficultyValue: bossDifficultyValue(boss),
      walletConnected: !!profile.wallet_address,
      antiFarm,
      caps: { walletDailyRemaining, modeDailyRemaining: modeRemaining },
    });
    const memearena = validation === "approved" ? reward.memearena : 0;

    // --- Persist battle row (reuse existing battles table + jsonb) ---
    const { data: battle } = await admin
      .from("battles")
      .insert({
        profile_id: profile.id,
        mode: "arena",
        boss_id: body.boss_id,
        deck_snapshot: body.deck_snapshot ?? [],
        battle_seed: body.seed ?? null,
        action_log: body.action_log ?? [],
        result: scoring.result,
        score: scoring.total,
        turns: final.maxTurns,
        damage_dealt: scoring.playerTotalPower,
        remaining_hp: scoring.locationsWon,
        combos_triggered: [],
        validation_status: validation,
        snap_locations: scoring.locations,
        snap_result: scoring,
      })
      .select("id")
      .single();

    // --- Reward ledger (token) ---
    if (memearena > 0) {
      await admin.from("reward_ledger").insert({
        profile_id: profile.id,
        battle_id: battle?.id ?? null,
        reward_type: "snap_battle",
        currency: "MEMEARENA",
        amount: memearena,
        status: "approved",
        reason: reward.reason,
        approved_at: new Date().toISOString(),
        metadata: { mode: "arena", boss_id: body.boss_id, score: scoring.total },
      });
    }

    // --- Non-token currencies (server-recomputed) ---
    await admin
      .from("profiles")
      .update({
        coins: (profile.coins ?? 0) + reward.coins,
        xp: (profile.xp ?? 0) + reward.xp,
        shards: (profile.shards ?? 0) + reward.shards,
        arena_tickets: (profile.arena_tickets ?? 0) + reward.tickets,
        player_level: Math.max(profile.player_level, 1 + Math.floor(((profile.xp ?? 0) + reward.xp) / 200)),
      })
      .eq("id", profile.id);

    // --- Daily limits ---
    await admin
      .from("daily_limits")
      .update({ [modeDailyKey]: modeUsed + memearena, total_rewards: totalUsed + memearena })
      .eq("profile_id", profile.id)
      .eq("date", date);

    // --- Leaderboard (weekly) ---
    if (scoring.result === "win" && scoring.total > 0) {
      await admin.from("leaderboard_entries").insert({
        profile_id: profile.id,
        mode: "arena",
        period: "weekly",
        score: scoring.total,
        metadata: { memearena, locationsWon: scoring.locationsWon },
      });
    }

    return json({
      ok: true,
      validation,
      result: scoring.result,
      score: scoring.total,
      locations_won: scoring.locationsWon,
      reward: { ...reward, memearena },
      battle_id: battle?.id,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
