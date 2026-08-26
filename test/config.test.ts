import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { configSchema, DEFAULT_CONFIG } from "../src/config/schema.js";
import { loadConfig, saveConfig } from "../src/config/store.js";

describe("configuration", () => {
  it("returns independent defaults when the file is absent", async () => {
    const config = await loadConfig(join(tmpdir(), `missing-devradar-${crypto.randomUUID()}.yaml`));
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(config).not.toBe(DEFAULT_CONFIG);
  });

  it("round-trips a validated YAML document", async () => {
    const directory = await mkdtemp(join(tmpdir(), "devradar-config-"));
    const path = join(directory, "config.yaml");
    await saveConfig(path, { ...DEFAULT_CONFIG, enabled: true });
    expect(await loadConfig(path)).toMatchObject({ enabled: true, version: 1 });
    expect(await readFile(path, "utf8")).toContain("task: 45");
  });

  it("rejects feed weights that do not total 100", () => {
    expect(() => configSchema.parse({ ...DEFAULT_CONFIG, feed: { task: 1, project: 1, global: 1 } })).toThrow(
      "feed weights must total 100",
    );
  });
});
