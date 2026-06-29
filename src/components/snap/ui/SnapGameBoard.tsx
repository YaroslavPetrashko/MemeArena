"use client";

import type { SnapMatchState } from "@/types/snap";
import { SnapLocationPanel, type LocationWinner } from "./SnapLocationPanel";

interface Props {
  match: SnapMatchState;
  selectable: boolean;
  invalidLocationId: string | null;
  onPlace: (locationId: string) => void;
  onUnstage: (instanceId: string) => void;
}

/** The 3-location cinematic playfield. */
export function SnapGameBoard({ match, selectable, invalidLocationId, onPlace, onUnstage }: Props) {
  const complete = match.status === "complete";

  return (
    <div
      className="mx-auto flex w-full max-w-full items-stretch justify-center gap-4 px-2 sm:gap-8"
      style={{ perspective: 1400 }}
    >
      {match.locations.map((loc) => {
        const stagedHere = match.stagedPlays
          .filter((p) => p.locationId === loc.id)
          .map((p) => match.player.hand.find((c) => c.instanceId === p.instanceId))
          .filter((c): c is NonNullable<typeof c> => !!c);

        const winner: LocationWinner =
          loc.playerPower > loc.bossPower ? "player" : loc.bossPower > loc.playerPower ? "boss" : "tie";

        return (
          <SnapLocationPanel
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
