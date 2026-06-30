// Render a PvP match from a given player's perspective.
//
// The canonical PvP snapshot always seats player A on the "player" side and
// player B on the "boss" side. So player A renders it as-is, but player B needs
// the board flipped so THEIR cards are on the south ("player") side — letting us
// reuse SnapGameBoard / SnapHand unchanged. Pure: never mutates the input.

import type { SnapMatchState, PlayerSnapState, BossSnapState } from "@/types/snap";

export type PvpSide = "player" | "boss";

/** Return a view of `state` where the viewer's side is "player" (south). */
export function viewFromSide(state: SnapMatchState, mySide: PvpSide): SnapMatchState {
  if (mySide === "player") {
    // Fresh top-level object + empty stagedPlays so local staging never mutates
    // the synced snapshot.
    return { ...state, stagedPlays: [] };
  }

  // Player B perspective: swap the two sides everywhere the UI reads.
  const locations = state.locations.map((loc) => ({
    ...loc,
    playerCards: loc.bossCards,
    bossCards: loc.playerCards,
    playerPower: loc.bossPower,
    bossPower: loc.playerPower,
  }));

  const me = state.boss; // BossSnapState (player B)
  const opp = state.player; // PlayerSnapState (player A)

  const player: PlayerSnapState = {
    profileId: me.bossId || "me",
    deck: me.deck,
    hand: me.hand,
    energy: me.energy,
    hasEndedTurn: false,
    pendingEnergy: me.pendingEnergy,
    nextCardBonus: 0,
  };
  const boss: BossSnapState = {
    bossId: "",
    deck: opp.deck,
    hand: opp.hand,
    personality: "aggressive",
    energy: opp.energy,
    pendingEnergy: opp.pendingEnergy,
  };

  return { ...state, locations, player, boss, energy: me.energy, stagedPlays: [] };
}
