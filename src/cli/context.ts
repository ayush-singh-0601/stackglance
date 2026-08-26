import type { DevRadarPaths } from "../core/paths.js";
import { resolvePaths } from "../core/paths.js";

export interface CliContext {
  paths: DevRadarPaths;
  now: () => Date;
}

export function createCliContext(): CliContext {
  return { paths: resolvePaths(), now: () => new Date() };
}
