import { getBoss, BOSS_RUSH_ORDER } from "@/data/bosses";
import type { Boss } from "@/types";

export const XP_PER_LEVEL = 200;

export function levelProgress(xp: number) {
  const level = Math.min(30, 1 + Math.floor(xp / XP_PER_LEVEL));
  const xpInto = xp % XP_PER_LEVEL;
  return {
    level,
    xpInto,
    xpForNext: XP_PER_LEVEL,
    pct: (xpInto / XP_PER_LEVEL) * 100,
  };
}

/** Is a boss unlocked given progression? */
export function isBossUnlocked(
  bossId: string,
  ctx: { playerLevel: number; defeatedBossIds: string[]; deckPower: number },
): boolean {
  const boss = getBoss(bossId);
  if (!boss) return false;
  const req = boss.unlock_requirement;
  if (req.always) return true;
  if (req.playerLevel && ctx.playerLevel < req.playerLevel) return false;
  if (req.defeatBossId && !ctx.defeatedBossIds.includes(req.defeatBossId)) return false;
  if (req.deckPower && ctx.deckPower < req.deckPower) return false;
  return true;
}

/** Next boss in the Boss Rush ladder the player should fight. */
export function nextBossRushBoss(defeatedBossIds: string[]): Boss {
  for (const id of BOSS_RUSH_ORDER) {
    if (!defeatedBossIds.includes(id)) return getBoss(id)!;
  }
  return getBoss(BOSS_RUSH_ORDER[BOSS_RUSH_ORDER.length - 1])!;
}

/** Stable event end: end of the current UTC week (next Monday 00:00). */
export function eventEndDate(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 Sun .. 6 Sat
  const daysUntilMonday = (8 - day) % 7 || 7;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
  return end;
}
