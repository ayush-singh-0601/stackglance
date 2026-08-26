import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { DevRadarPaths } from "../core/paths.js";
import { DevRadarDatabase } from "../storage/database.js";
import { startIpcServer, type IpcServer } from "./ipc.js";
import type { IpcRequest, IpcResponse } from "./protocol.js";
import { acquireSingleton, type SingletonLease } from "./singleton.js";

export interface RunningDaemon {
  alreadyRunning: boolean;
  close: () => Promise<void>;
}

export async function startDaemon(
  paths: DevRadarPaths,
  handler: (request: IpcRequest) => Promise<IpcResponse> | IpcResponse = () => ({
    ok: true,
    decision: { show: false, reason: "no eligible story" },
  }),
): Promise<RunningDaemon> {
  await mkdir(paths.runtime, { recursive: true, mode: 0o700 });
  const lease = await acquireSingleton(join(paths.runtime, "daemon.lock"));
  if (lease === undefined) return { alreadyRunning: true, close: () => Promise.resolve() };

  let ipc: IpcServer | undefined;
  let database: DevRadarDatabase | undefined;
  try {
    if (process.platform !== "win32") await rm(paths.socket, { force: true });
    database = new DevRadarDatabase(paths.database);
    ipc = await startIpcServer(paths.socket, handler);
  } catch (error) {
    database?.close();
    await lease.release();
    throw error;
  }

  return createRunningDaemon(paths, lease, ipc, database);
}

function createRunningDaemon(
  paths: DevRadarPaths,
  lease: SingletonLease,
  ipc: IpcServer,
  database: DevRadarDatabase,
): RunningDaemon {
  let closed = false;
  return {
    alreadyRunning: false,
    close: async () => {
      if (closed) return;
      closed = true;
      await ipc.close();
      database.close();
      if (process.platform !== "win32") await rm(paths.socket, { force: true });
      await lease.release();
    },
  };
}
