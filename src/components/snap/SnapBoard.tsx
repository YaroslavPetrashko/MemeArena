"use client";

import type { SnapMatchState } from "@/types/snap";
import { SnapLocation } from "./SnapLocation";

interface Props {
  match: SnapMatchState;
  selectable: boolean;
  invalidLocationId: string | null;
  onPlace: (locationId: string) => void;
  onUnstage: (instanceId: string) => void;
}

/** The 3-location playfield. */
export function SnapBoard({ match, selectable, invalidLocationId, onPlace, onUnstage }: Props) {
  const complete = match.status === "complete";

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      {match.locations.map((loc) => {
        // Player staged cards for this location (not yet on board).
        const stagedHere = match.stagedPlays
          .filter((p) => p.locationId === loc.id)
          .map((p) => match.player.hand.find((c) => c.instanceId === p.instanceId))
          .filter((c): c is NonNullable<typeof c> => !!c);

        const winner =
          loc.playerPower > loc.bossPower ? "player" :
          loc.bossPower > loc.playerPower ? "boss" : "tie";

        return (
          <SnapLocation
            key={loc.id}
            location={loc}
            stagedHere={stagedHere}
            matchComplete={complete}
            selectable={selectable && loc.isRevealed}
            invalid={invalidLocationId === loc.id}
            winner={winner}
            onPlace={() => onPlace(loc.id)}
            onUnstage={onUnstage}
          />
        );
      })}
    </div>
  );
}
