"use client";

import { create } from "zustand";

/**
 * Coordinates drag-to-place between the hand (drag source) and the location
 * panels (drop targets). Each revealed location registers its on-screen rect;
 * the store resolves which zone the pointer is over and exposes only that
 * single `hoveredZoneId`.
 *
 * IMPORTANT (perf): we deliberately do NOT store the raw live pointer in state.
 * The pointer changes every animation frame during a drag; if panels subscribed
 * to it they would each re-render ~60fps and freeze the board. Instead the store
 * computes `hoveredZoneId` internally and only writes when it actually changes,
 * so a panel re-renders only when its own hover flips.
 *
 * Kept separate from snapStore so the gameplay/engine state stays untouched.
 */
interface DropZone {
  locationId: string;
  /** Live element, so rects can be re-measured at hit-test time. */
  el: HTMLElement;
}

interface SnapDragStore {
  /** instanceId of the card currently being dragged, or null. */
  draggingId: string | null;
  /** The single location the pointer is currently over, or null. */
  hoveredZoneId: string | null;

  beginDrag: (instanceId: string) => void;
  /** Update pointer position; recomputes hoveredZoneId without storing the point. */
  moveDrag: (x: number, y: number) => void;
  endDrag: () => void;
  /** Authoritative drop hit-test at release time (re-measures live rects). */
  resolveDropAt: (x: number, y: number) => string | null;
  registerZone: (zone: DropZone) => void;
  unregisterZone: (locationId: string) => void;
}

/**
 * Registered drop-zone elements live OUTSIDE React/zustand state so updating
 * them never triggers a render. Only `hoveredZoneId` (derived) is reactive.
 * We keep the element (not a cached rect) and re-measure on demand, so hit-tests
 * are always against the location's current on-screen position.
 */
const zones = new Map<string, HTMLElement>();

/**
 * Hit-test a VIEWPORT-space pointer position against the registered zone rects.
 *
 * Callers pass viewport coordinates (the dragged card reads them from the native
 * pointer event's clientX/clientY), which already match getBoundingClientRect()'s
 * coordinate space — so no page→viewport conversion is needed here.
 */
function resolveZone(x: number, y: number): string | null {
  for (const [id, el] of zones) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
  }
  return null;
}

export const useSnapDrag = create<SnapDragStore>((set, get) => ({
  draggingId: null,
  hoveredZoneId: null,

  beginDrag: (instanceId) => set({ draggingId: instanceId }),

  moveDrag: (x, y) => {
    const next = resolveZone(x, y);
    // Only write when the hovered zone actually changes — avoids per-frame renders.
    if (next !== get().hoveredZoneId) set({ hoveredZoneId: next });
  },

  endDrag: () => set({ draggingId: null, hoveredZoneId: null }),

  resolveDropAt: (x, y) => resolveZone(x, y),

  registerZone: (zone) => zones.set(zone.locationId, zone.el),
  unregisterZone: (locationId) => zones.delete(locationId),
}));
