import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { parse, stringify } from "yaml";

import { configSchema, DEFAULT_CONFIG, type StackGlanceConfig } from "./schema.js";

export async function loadConfig(path: string): Promise<StackGlanceConfig> {
  try {
    return configSchema.parse(migrateLegacyConfig(parse(await readFile(path, "utf8"))));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(DEFAULT_CONFIG);
    throw error;
  }
}

function migrateLegacyConfig(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const document = structuredClone(value) as Record<string, unknown>;
  const sources = asRecord(document.sources);
  const display = asRecord(document.display);

  // StackGlance 0.1.5 used a 20-second cycle. Only migrate that exact legacy
  // default so deliberately customized intervals remain untouched.
  if (!("codexNews" in sources) && display.quietDurationMs === 12_000) {
    display.quietDurationMs = 5_000;
    document.display = display;
  }
  return document;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export async function saveConfig(path: string, config: StackGlanceConfig): Promise<void> {
  const valid = configSchema.parse(config);
  const temporary = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(temporary, stringify(valid), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

export async function updateConfig(
  path: string,
  update: (config: StackGlanceConfig) => StackGlanceConfig,
): Promise<StackGlanceConfig> {
  const next = configSchema.parse(update(await loadConfig(path)));
  await saveConfig(path, next);
  return next;
}
