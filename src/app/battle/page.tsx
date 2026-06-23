"use client";

import { ArenaBattleScreen } from "@/components/battle/ArenaBattleScreen";

/**
 * The arena battle. The old turn-based damage/shield sim has been replaced by a
 * 3-lane real-time PvE card deployer (engine in /lib/game/arena*, UI in
 * /components/battle/Arena*). The arena store owns the simulation loop.
 */
export default function BattlePage() {
  return <ArenaBattleScreen />;
}
