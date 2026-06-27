"use client";

import { Button } from "@/components/ui/Button";
import { Swords } from "lucide-react";

interface Props {
  disabled?: boolean;
  revealing?: boolean;
  stagedCount: number;
  onEndTurn: () => void;
}

export function SnapEndTurnButton({ disabled, revealing, stagedCount, onEndTurn }: Props) {
  return (
    <Button
      size="lg"
      variant="primary"
      disabled={disabled}
      loading={revealing}
      onClick={onEndTurn}
      className="w-full"
    >
      <Swords className="size-5" />
      {revealing ? "Revealing…" : stagedCount > 0 ? `End Turn · ${stagedCount} staged` : "End Turn"}
    </Button>
  );
}
