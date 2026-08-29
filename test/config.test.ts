import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { stringify } from "yaml";

import { configSchema, DEFAULT_CONFIG } from "../src/config/schema.js";
import { loadConfig, saveConfig } from "../src/config/store.js";

describe("configuration", () => {
  it("returns independent defaults when the file is absent", async () => {
    const config = await loadConfig(
      join(tmpdir(), `missing-stackglance-${crypto.randomUUID()}.yaml`),
    );
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(config).not.toBe(DEFAULT_CONFIG);
  });

  it("round-trips a validated YAML document", async () => {
    const directory = await mkdtemp(join(tmpdir(), "stackglance-config-"));
    const path = join(directory, "config.yaml");
    await saveConfig(path, { ...DEFAULT_CONFIG, enabled: true });
    expect(await loadConfig(path)).toMatchObject({ enabled: true, version: 1 });
    expect(await readFile(path, "utf8")).toContain("task: 45");
  });

  it("rejects feed weights that do not total 100", () => {
    expect(() =>
      configSchema.parse({ ...DEFAULT_CONFIG, feed: { task: 1, project: 1, global: 1 } }),
    ).toThrow("feed weights must total 100");
  });

  it("migrates the legacy 20-second display cycle and keeps Codex news opt-in", async () => {
    const directory = await mkdtemp(join(tmpdir(), "stackglance-legacy-config-"));
    const path = join(directory, "config.yaml");
    const legacy = structuredClone(DEFAULT_CONFIG);
    Reflect.deleteProperty(legacy.sources, "codexNews");
    legacy.display.quietDurationMs = 12_000;
    await writeFile(path, stringify(legacy), "utf8");

    expect(await loadConfig(path)).toMatchObject({
      display: { thinkingDelayMs: 3_000, cardDurationMs: 8_000, quietDurationMs: 5_000 },
      sources: { codexNews: { enabled: false } },
    });
  });
});
