"use client";

import { SnapBattleScreen } from "@/components/snap/SnapBattleScreen";

/**
 * The battle screen. MemeArena is now a Marvel SNAP-style PvE card game:
 * 6 turns, 3 locations, simultaneous reveal, win 2 of 3 locations. The previous
 * real-time 3-lane arena deployer has been fully removed. Engine lives in
 * /lib/game/snap/*, UI in /components/snap/*, state in /store/snapStore.ts.
 */
export default function BattlePage() {
  return <SnapBattleScreen />;
}
