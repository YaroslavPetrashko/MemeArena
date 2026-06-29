"use client";

/**
 * The card design now lives in ./ui/SnapCard (collectible battle card). This
 * module re-exports it so deck/upgrades/detail screens share the same polished
 * card. The props are a superset of the old API (size/faceDown/selected/
 * playable/dimmed/showAbility/onClick/className/highlightPower).
 */
export { SnapCard } from "./ui/SnapCard";
export type { SnapCardProps } from "./ui/SnapCard";
