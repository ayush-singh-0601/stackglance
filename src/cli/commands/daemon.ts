import { startDaemon } from "../../daemon/run.js";
import { createRadarHandler } from "../../runtime/engine.js";
import type { CliContext } from "../context.js";
import type { CliIo } from "../run.js";

export async function runDaemonCommand(context: CliContext, io: CliIo): Promise<number> {
  const daemon = await startDaemon(context.paths, createRadarHandler(context.paths));
  if (daemon.alreadyRunning) return 0;
  io.stdout.write("DevRadar daemon ready.\n");
  await new Promise<void>((resolve) => {
    const stop = (): void => resolve();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  await daemon.close();
  return 0;
}
