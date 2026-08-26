import { mkdir, open, readFile, rm, type FileHandle } from "node:fs/promises";
import { dirname } from "node:path";

export interface SingletonLease {
  path: string;
  release: () => Promise<void>;
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function createLease(path: string): Promise<{ handle: FileHandle; lease: SingletonLease }> {
  const handle = await open(path, "wx", 0o600);
  await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  let released = false;
  return {
    handle,
    lease: {
      path,
      release: async () => {
        if (released) return;
        released = true;
        await handle.close();
        await rm(path, { force: true });
      },
    },
  };
}

export async function acquireSingleton(path: string): Promise<SingletonLease | undefined> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    return (await createLease(path)).lease;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }

  try {
    const existing = JSON.parse(await readFile(path, "utf8")) as { pid?: number };
    if (typeof existing.pid === "number" && processExists(existing.pid)) return undefined;
  } catch {
    // A corrupt lease is stale and is replaced below.
  }

  await rm(path, { force: true });
  return (await createLease(path)).lease;
}
