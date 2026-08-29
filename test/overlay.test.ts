import { describe, expect, it, vi } from "vitest";

import { TerminalCardOverlay } from "../src/terminal/overlay.js";
import type { RenderedCard } from "../src/terminal/render.js";

const card: RenderedCard = {
  text: "top\nmiddle\nbottom\n",
  lines: 3,
  width: 40,
};

describe("terminal card overlay", () => {
  it("reserves bottom rows without scrolling or erasing the agent screen", () => {
    const writes: string[] = [];
    const resize = vi.fn();
    const overlay = new TerminalCardOverlay(
      { columns: 80, rows: 24, write: (value) => writes.push(value) },
      resize,
    );

    expect(overlay.show(card)).toBe(true);
    expect(overlay.reservedRows).toBe(3);
    expect(resize).toHaveBeenCalledTimes(1);
    expect(writes[0]).toContain("\u001b[22;1H\u001b[2Ktop");
    expect(writes[0]).toContain("\u001b[24;1H\u001b[2Kbottom");
    expect(writes[0]).not.toContain("\n");

    overlay.repaint();
    expect(resize).toHaveBeenCalledTimes(1);

    overlay.hide();
    expect(overlay.reservedRows).toBe(0);
    expect(resize).toHaveBeenCalledTimes(2);
    expect(writes.at(-1)).not.toContain("top");
  });

  it("coalesces live agent output before repainting the overlay", () => {
    vi.useFakeTimers();
    const writes: string[] = [];
    const overlay = new TerminalCardOverlay(
      { columns: 80, rows: 24, write: (value) => writes.push(value) },
      () => undefined,
    );
    overlay.show(card);

    overlay.scheduleRepaint();
    overlay.scheduleRepaint();
    expect(writes).toHaveLength(1);
    vi.advanceTimersByTime(25);
    expect(writes).toHaveLength(2);
    vi.useRealTimers();
  });

  it("refuses to crowd the agent in a short terminal", () => {
    const resize = vi.fn();
    const overlay = new TerminalCardOverlay(
      { columns: 80, rows: 8, write: () => undefined },
      resize,
    );

    expect(overlay.show(card)).toBe(false);
    expect(overlay.reservedRows).toBe(0);
    expect(resize).not.toHaveBeenCalled();
  });
});
