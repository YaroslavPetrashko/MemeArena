"use client";

import type { SnapMatchState } from "@/types/snap";
import { SnapLocationPanel, type LocationWinner } from "./SnapLocationPanel";

interface Props {
  match: SnapMatchState;
  selectable: boolean;
  invalidLocationId: string | null;
  onPlace: (locationId: string) => void;
  onUnstage: (instanceId: string) => void;
  onStagedDrop?: (instanceId: string, fromLocationId: string, toLocationId: string | null) => void;
}

/** The 3-location cinematic playfield. */
export function SnapGameBoard({ match, selectable, invalidLocationId, onPlace, onUnstage, onStagedDrop }: Props) {
  const complete = match.status === "complete";

  return (
    <div className="flex w-full justify-center">
      {/* The board has a fixed natural width (3 × 272px locations). On small
          screens that overflows, so we scale it down to fit while keeping all
          three locations visible (Marvel-SNAP style). getBoundingClientRect
          reflects the scaled rects, so drag-to-place hit-testing still works. */}
      <div
        className="flex origin-center items-stretch justify-center gap-2 scale-[0.44] min-[400px]:scale-[0.52] min-[520px]:scale-[0.66] min-[680px]:scale-[0.82] sm:gap-6 md:scale-100 md:gap-8"
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
            onStagedDrop={onStagedDrop}
          />
        );
        })}
      </div>
    </div>
  );
}
