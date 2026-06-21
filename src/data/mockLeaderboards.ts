import type { LeaderboardEntry, GameModeId, LeaderboardPeriod } from "@/types";

/**
 * Seed leaderboard data so the boards never look empty pre-launch. Real player
 * entries from Supabase are merged on top of these by the leaderboard page.
 */
const HANDLES = [
  "0xChadwick", "wifhat_andy", "moodeng_maxi", "sahur_3am", "pepe_eternal",
  "liquiditysniper", "bonk_baron", "gigabrain", "popcat_pro", "tralala_ttt",
  "rugproof", "jeetslayer", "whalebait", "sigmagrind", "brainrot_btw",
];

function makeEntries(mode: GameModeId, period: LeaderboardPeriod, base: number): LeaderboardEntry[] {
  return HANDLES.map((username, i) => ({
    id: `mock_${mode}_${period}_${i}`,
    profile_id: `mock_${i}`,
    username,
    wallet_address: i % 3 === 0 ? `${username.slice(0, 4)}…${(1000 + i).toString()}` : null,
    mode,
    period,
    score: Math.round(base - i * (base * 0.045) - (i % 3) * 7),
    rank: i + 1,
    metadata: { memearenaWon: Math.round((base - i * 30) / 40) },
  }));
}

export const MOCK_LEADERBOARDS: Record<string, LeaderboardEntry[]> = {
  "daily_boss:weekly": makeEntries("daily_boss", "weekly", 2400),
  "survival:weekly": makeEntries("survival", "weekly", 1850),
  "limited_event:weekly": makeEntries("limited_event", "weekly", 3200),
  "boss_rush:all_time": makeEntries("boss_rush", "all_time", 5600),
};

export function getMockLeaderboard(
  mode: GameModeId,
  period: LeaderboardPeriod,
): LeaderboardEntry[] {
  return MOCK_LEADERBOARDS[`${mode}:${period}`] ?? [];
}
