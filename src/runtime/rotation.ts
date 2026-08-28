import type { StackGlanceConfig } from "../config/schema.js";
import type { GlanceScope } from "../core/types.js";

export interface RotationSlot {
  show: boolean;
  scope?: GlanceScope;
  slot: number;
  remainingMs: number;
}

const DEFAULT_ORDER: readonly GlanceScope[] = ["task", "global", "project"];

export function rotationAt(
  elapsedMs: number,
  display: StackGlanceConfig["display"],
  order: readonly GlanceScope[] = DEFAULT_ORDER,
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
