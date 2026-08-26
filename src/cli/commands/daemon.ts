import { startDaemon } from "../../daemon/run.js";
import { createRadarHandler } from "../../runtime/engine.js";
import { loadConfig } from "../../config/store.js";
import { refreshDefaultIntelligence } from "../../intelligence/refresh.js";
import type { CliContext } from "../context.js";
import type { CliIo } from "../run.js";

export async function runDaemonCommand(context: CliContext, io: CliIo): Promise<number> {
  const daemon = await startDaemon(context.paths, createRadarHandler(context.paths));
  if (daemon.alreadyRunning) return 0;
  io.stdout.write("DevRadar daemon ready.\n");
  const config = await loadConfig(context.paths.config);
  const refresh = (): void => {
    void refreshDefaultIntelligence(context.paths, context.cwd ?? process.cwd()).catch(() => undefined);
  };
  refresh();
  const refreshTimer = setInterval(refresh, config.sources.refreshMinutes * 60_000);
  refreshTimer.unref();
  await new Promise<void>((resolve) => {
    const stop = (): void => resolve();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  clearInterval(refreshTimer);
  await daemon.close();
  return 0;
}
