import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { initialize } from "../src/cli/commands/init.js";
import { loadConfig } from "../src/config/store.js";
import { resolvePaths } from "../src/core/paths.js";

describe("init command", () => {
  it("creates enabled local state and reports detections", async () => {
    const root = await mkdtemp(`${tmpdir()}\\devradar-init-`);
    const paths = resolvePaths({ env: { DEVRADAR_HOME: root } });
    const output: string[] = [];
    const code = await initialize(
      paths,
      { stdout: { write: (value) => output.push(value) }, stderr: { write: () => undefined } },
      { detect: () => [{ agent: "codex", command: "codex", installed: true, executable: "codex" }] },
    );
    expect(code).toBe(0);
    expect((await loadConfig(paths.config)).enabled).toBe(true);
    expect(output.join("")).toContain("✓ codex");
  });
});
