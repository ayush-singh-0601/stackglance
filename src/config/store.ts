import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { parse, stringify } from "yaml";

import { configSchema, DEFAULT_CONFIG, type DevRadarConfig } from "./schema.js";

export async function loadConfig(path: string): Promise<DevRadarConfig> {
  try {
    return configSchema.parse(parse(await readFile(path, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(DEFAULT_CONFIG);
    throw error;
  }
}

export async function saveConfig(path: string, config: DevRadarConfig): Promise<void> {
  const valid = configSchema.parse(config);
  const temporary = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(temporary, stringify(valid), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

export async function updateConfig(
  path: string,
  update: (config: DevRadarConfig) => DevRadarConfig,
): Promise<DevRadarConfig> {
  const next = configSchema.parse(update(await loadConfig(path)));
  await saveConfig(path, next);
  return next;
}
