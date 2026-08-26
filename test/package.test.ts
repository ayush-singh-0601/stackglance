import { describe, expect, it } from "vitest";

import { packageName, version } from "../src/index.js";

describe("package metadata", () => {
  it("exports the scoped package identity", () => {
    expect(packageName).toBe("@ayush-singh-0601/devradar");
    expect(version).toMatch(/^\d+\.\d+\.\d+$/u);
  });
});
