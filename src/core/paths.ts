import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export interface DevRadarPaths {
  root: string;
  config: string;
  database: string;
  runtime: string;
  socket: string;
  log: string;
}

export interface PathOptions {
  env?: NodeJS.ProcessEnv;
  home?: string;
  platform?: NodeJS.Platform;
}

function defaultRoot(env: NodeJS.ProcessEnv, home: string, platform: NodeJS.Platform): string {
  if (platform === "win32") {
    return join(env.LOCALAPPDATA ?? env.APPDATA ?? join(home, "AppData", "Local"), "DevRadar");
  }

  return join(env.XDG_STATE_HOME ?? join(home, ".local", "state"), "devradar");
}

export function resolvePaths(options: PathOptions = {}): DevRadarPaths {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir();
  const root = env.DEVRADAR_HOME ?? defaultRoot(env, home, platform);
  const runtime = join(root, "run");
  const socket =
    platform === "win32"
      ? "\\\\.\\pipe\\devradar"
      : join(env.XDG_RUNTIME_DIR ?? join(tmpdir(), `devradar-${process.getuid?.() ?? "user"}`), "daemon.sock");

  return {
    root,
    config: join(root, "config.yaml"),
    database: join(root, "devradar.sqlite"),
    runtime,
    socket,
    log: join(root, "devradar.log"),
  };
}
