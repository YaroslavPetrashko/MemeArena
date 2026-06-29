// Competitive ranks (ELO) for the Arena ladder.
//
// Pure, client-side progression: Rank Points (RP) rise on wins (more for harder
// bots + win-streaks) and fall a little on losses. RP maps to meme-themed tiers
// with III→II→I divisions, up to the single apex "Meme Lord". Higher tiers also
// boost soft-currency payouts and raise the player's personal MEMEARENA daily
// cap (still under the global ceilings in rewardEconomy.ts).
//
// MEMEARENA stays server-authoritative: the tier cap below is an OPTIMISTIC
// client-side ceiling; the server recomputes the base amount under the global
// caps until rank is persisted server-side.

export const RP_PER_DIVISION = 100;
export const DIVISIONS_PER_TIER = 3;
export const RP_PER_TIER = RP_PER_DIVISION * DIVISIONS_PER_TIER; // 300

/** Climbing tiers (low → high). The apex tier has no divisions. */
export interface TierDef {
  name: string;
  /** Accent color for the badge. */
  color: string;
  /** Emoji icon for the badge. */
  icon: string;
}

export const TIERS: TierDef[] = [
  { name: "Paperhands", color: "#9aa0ad", icon: "🧻" },
  { name: "Shrimp", color: "#f9a8d4", icon: "🦐" },
  { name: "Crab", color: "#fb923c", icon: "🦀" },
  { name: "Degen", color: "#2dd4bf", icon: "🎲" },
  { name: "Ape", color: "#a3e635", icon: "🦍" },
  { name: "Chad", color: "#38bdf8", icon: "💪" },
  { name: "Whale", color: "#818cf8", icon: "🐋" },
  { name: "Giga", color: "#c084fc", icon: "🗿" },
];

/** Apex tier reached at RP >= APEX_RP. */
export const APEX_TIER: TierDef = { name: "Meme Lord", color: "#ffd24a", icon: "👑" };
export const APEX_RP = TIERS.length * RP_PER_TIER; // 2400

export interface Rank {
  /** 0-based climbing-tier index; TIERS.length for the apex. */
  tierIndex: number;
  tierName: string;
  color: string;
  icon: string;
  /** 1 (lowest, "III") .. 3 ("I"); 0 for the apex. */
  division: number;
  /** Roman numeral for the division, "" for apex. */
  divisionLabel: string;
  isApex: boolean;
  /** RP accumulated into the current division (0 for apex). */
  rpInto: number;
  /** RP needed to fill the current division (0 for apex). */
  rpForNext: number;
  /** Total RP. */
  rp: number;
}

const ROMAN = ["", "III", "II", "I"]; // index by division 1..3

/** Resolve a Rank from total RP. */
export function rankForRp(rpRaw: number): Rank {
  const rp = Math.max(0, Math.round(rpRaw));
  if (rp >= APEX_RP) {
    return {
      tierIndex: TIERS.length,
      tierName: APEX_TIER.name,
      color: APEX_TIER.color,
      icon: APEX_TIER.icon,
      division: 0,
      divisionLabel: "",
      isApex: true,
      rpInto: 0,
      rpForNext: 0,
      rp,
    };
  }
  const tierIndex = Math.floor(rp / RP_PER_TIER); // 0..7
  const rpInTier = rp - tierIndex * RP_PER_TIER; // 0..299
  // Division III (0-99) → II (100-199) → I (200-299). Higher division = closer to promotion.
  const division = Math.floor(rpInTier / RP_PER_DIVISION) + 1; // 1..3
  const tier = TIERS[tierIndex];
  return {
    tierIndex,
    tierName: tier.name,
    color: tier.color,
    icon: tier.icon,
    division,
    divisionLabel: ROMAN[division],
    isApex: false,
    rpInto: rpInTier % RP_PER_DIVISION,
    rpForNext: RP_PER_DIVISION,
    rp,
  };
}

/** A short "Ape II" / "Meme Lord" label. */
export function rankLabel(rank: Rank): string {
  return rank.isApex ? rank.tierName : `${rank.tierName} ${rank.divisionLabel}`;
}

/**
 * RP change for a match. Wins scale with bot difficulty + win-streak; losses are
 * forgiving (you're playing bots). The caller floors total RP at 0.
 */
export function rpDelta(won: boolean, difficultyValue: number, streak: number): number {
  if (!won) return -12;
  return 25 + difficultyValue * 3 + Math.min(streak, 5) * 2;
}

/** Soft-currency (Coins/Gems) multiplier by climbing-tier index. Capped at 2.0. */
export function rankRewardMultiplier(tierIndex: number): number {
  return Math.min(2, 1 + tierIndex * 0.12);
}

/** Win-streak multiplier for rewards (+10% per win, capped at +50%). */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(0.5, Math.max(0, streak) * 0.1);
}

/**
 * Personal MEMEARENA daily cap by tier (Paperhands 5 → Meme Lord ~25). Always
 * min'd with the global per-mode cap by the reward function.
 */
export function tierTokenCap(tierIndex: number): number {
  return Math.round(5 + tierIndex * 2.5);
}

/* ----------------------------- Seasons ----------------------------- */

/** Current season id (monthly), e.g. "2026-06". */
export function currentSeasonId(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Soft RP reset at the start of a new season (keeps ~40% so you don't start cold). */
export function seasonReset(rp: number): number {
  return Math.max(0, Math.round(rp * 0.4));
}

/** End-of-season reward, scaled by the peak climbing-tier reached that season. */
export function seasonReward(peakTierIndex: number): { coins: number; gems: number } {
  const t = Math.max(0, Math.min(TIERS.length, peakTierIndex));
  return { coins: 250 + t * 150, gems: t * 10 };
}
