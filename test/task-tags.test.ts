import { describe, expect, it } from "vitest";

import { extractTaskTags } from "../src/intelligence/task-tags.js";

describe("private task tags", () => {
  it("extracts useful concepts without retaining common instructions", () => {
    expect(extractTaskTags("Implement Redis caching for the Next.js API").tags).toEqual([
      "redis",
      "caching",
      "next.js",
      "api",
    ]);
  });

  it("redacts credentials, email, and local paths before tagging", () => {
    const input = "Fix C:\\Users\\alice\\secret.ts for alice@example.com token=ghp_abcdefghijklmnop";
    const output = extractTaskTags(input);
    expect(output.redacted).not.toContain("alice");
    expect(output.redacted).not.toContain("ghp_");
    expect(output.redacted).toContain("[redacted]");
    expect(output.tags).not.toContain("secret.ts");
  });
});
