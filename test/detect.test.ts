import { delimiter, join } from "node:path";

import { describe, expect, it } from "vitest";

import { detectAgents, findExecutable } from "../src/agents/detect.js";

describe("agent detection", () => {
  it("finds a command on PATH without invoking a shell", () => {
    const target = join("tools", "codex");
    expect(
      findExecutable("codex", {
        env: { PATH: ["other", "tools"].join(delimiter) },
        platform: "linux",
        canExecute: (path) => path === target,
      }),
    ).toBe(target);
  });

  it("reports every supported agent", () => {
    const agents = detectAgents({ env: { PATH: "" }, platform: "linux", canExecute: () => false });
    expect(agents).toHaveLength(5);
    expect(agents.every(({ installed }) => !installed)).toBe(true);
  });
});
