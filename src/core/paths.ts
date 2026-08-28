import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export interface StackGlancePaths {
  root: string;
  config: string;
  database: string;
  runtime: string;
  bin: string;
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
    return join(env.LOCALAPPDATA ?? env.APPDATA ?? join(home, "AppData", "Local"), "StackGlance");
  }

  return join(env.XDG_STATE_HOME ?? join(home, ".local", "state"), "stackglance");
}

export function resolvePaths(options: PathOptions = {}): StackGlancePaths {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir();
  const root = env.STACKGLANCE_HOME ?? defaultRoot(env, home, platform);
  const runtime = join(root, "run");
  const socket =
    platform === "win32"
      ? "\\\\.\\pipe\\stackglance"
      : join(
          env.XDG_RUNTIME_DIR ?? join(tmpdir(), `stackglance-${process.getuid?.() ?? "user"}`),
          "daemon.sock",
        );

  return {
    root,
    config: join(root, "config.yaml"),
    database: join(root, "stackglance.sqlite"),
    runtime,
    bin: join(root, "bin"),
    socket,
    log: join(root, "stackglance.log"),
  };
}
