import { describe, expect, it } from "vitest";

import { packageName, version } from "../src/index.js";

describe("package metadata", () => {
  it("exports the package identity", () => {
    expect(packageName).toBe("stackglance");
    expect(version).toMatch(/^\d+\.\d+\.\d+$/u);
  });
});
