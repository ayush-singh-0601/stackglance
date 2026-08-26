import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { acquireSingleton } from "../src/daemon/singleton.js";

describe("daemon singleton", () => {
  it("allows exactly one live lease", async () => {
    const root = await mkdtemp(join(tmpdir(), "devradar-lock-"));
    const path = join(root, "daemon.lock");
    const first = await acquireSingleton(path);
    expect(first).toBeDefined();
    expect(await acquireSingleton(path)).toBeUndefined();
    await first?.release();
    const next = await acquireSingleton(path);
    expect(next).toBeDefined();
    await next?.release();
  });
});
