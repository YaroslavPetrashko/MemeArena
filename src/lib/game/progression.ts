import { getSnapBoss, BOSS_RUSH_ORDER } from "@/data/snapBosses";
import type { SnapBoss } from "@/types/snap";

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

/** Is a boss unlocked given progression? Sequential: clear the prior boss. */
export function isBossUnlocked(
  bossId: string,
  ctx: { playerLevel: number; defeatedBossIds: string[]; deckPower: number },
): boolean {
  const boss = getSnapBoss(bossId);
  if (!boss) return false;
  if (!boss.unlockAfterBossId) return true;
  return ctx.defeatedBossIds.includes(boss.unlockAfterBossId);
}

/** Next boss in the Boss Rush ladder the player should fight. */
export function nextBossRushBoss(defeatedBossIds: string[]): SnapBoss {
  for (const id of BOSS_RUSH_ORDER) {
    if (!defeatedBossIds.includes(id)) return getSnapBoss(id)!;
  }
  return getSnapBoss(BOSS_RUSH_ORDER[BOSS_RUSH_ORDER.length - 1])!;
}

/** Stable event end: end of the current UTC week (next Monday 00:00). */
export function eventEndDate(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 Sun .. 6 Sat
  const daysUntilMonday = (8 - day) % 7 || 7;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
  return end;
}
