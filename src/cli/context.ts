import type { StackGlancePaths } from "../core/paths.js";
import { resolvePaths } from "../core/paths.js";
import { homedir } from "node:os";

export interface CliContext {
  paths: StackGlancePaths;
  now: () => Date;
  home?: string | undefined;
  cwd?: string | undefined;
}

export function createCliContext(): CliContext {
  return { paths: resolvePaths(), now: () => new Date(), home: homedir(), cwd: process.cwd() };
}
