import type { DevRadarConfig } from "../config/schema.js";
import type { RadarScope } from "../core/types.js";

export interface RotationSlot {
  show: boolean;
  scope?: RadarScope;
  slot: number;
  remainingMs: number;
}

const DEFAULT_ORDER: readonly RadarScope[] = ["task", "global", "project"];

export function rotationAt(
  elapsedMs: number,
  display: DevRadarConfig["display"],
  order: readonly RadarScope[] = DEFAULT_ORDER,
): RotationSlot {
  if (order.length === 0) return { show: false, slot: 0, remainingMs: display.quietDurationMs };
  const interval = display.cardDurationMs + display.quietDurationMs;
  const safeElapsed = Math.max(0, elapsedMs);
  const slot = Math.floor(safeElapsed / interval);
  const withinSlot = safeElapsed % interval;
  const show = withinSlot < display.cardDurationMs;
  const remainingMs = (show ? display.cardDurationMs : interval) - withinSlot;
  const scope = order[slot % order.length];
  return { show, ...(show && scope !== undefined ? { scope } : {}), slot, remainingMs };
}
