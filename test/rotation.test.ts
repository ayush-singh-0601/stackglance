import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/config/schema.js";
import { rotationAt } from "../src/runtime/rotation.js";

describe("calm card rotation", () => {
  const display = DEFAULT_CONFIG.display;

  it("shows eight seconds then stays quiet for twelve", () => {
    expect(rotationAt(0, display)).toMatchObject({ show: true, scope: "task", remainingMs: 8_000 });
    expect(rotationAt(7_999, display)).toMatchObject({ show: true, remainingMs: 1 });
    expect(rotationAt(8_000, display)).toMatchObject({ show: false, remainingMs: 12_000 });
    expect(rotationAt(19_999, display)).toMatchObject({ show: false, remainingMs: 1 });
  });

  it("rotates scope only after a quiet interval", () => {
    expect(rotationAt(20_000, display)).toMatchObject({ show: true, scope: "global", slot: 1 });
    expect(rotationAt(40_000, display)).toMatchObject({ show: true, scope: "project", slot: 2 });
    expect(rotationAt(60_000, display)).toMatchObject({ show: true, scope: "task", slot: 3 });
  });
});
