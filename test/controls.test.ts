import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { setGlobalEnabled } from "../src/cli/commands/controls.js";
import type { CliContext } from "../src/cli/context.js";
import { loadConfig } from "../src/config/store.js";
import { resolvePaths } from "../src/core/paths.js";

describe("persistent controls", () => {
  it("enables and disables passive intelligence", async () => {
    const root = await mkdtemp(`${tmpdir()}\\devradar-controls-`);
    const context: CliContext = { paths: resolvePaths({ env: { DEVRADAR_HOME: root } }), now: () => new Date() };
    const text: string[] = [];
    const io = { stdout: { write: (value: string) => text.push(value) }, stderr: { write: () => undefined } };
    await setGlobalEnabled(true, context, io);
    expect((await loadConfig(context.paths.config)).enabled).toBe(true);
    await setGlobalEnabled(false, context, io);
    expect((await loadConfig(context.paths.config)).enabled).toBe(false);
    expect(text.join(" ")).toContain("disabled");
  });
});
