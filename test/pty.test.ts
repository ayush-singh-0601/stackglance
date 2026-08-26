import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import { normalizePtyEnvironment, runObservedCommand, type PtyProcessLike } from "../src/terminal/pty.js";

describe("PTY observation", () => {
  it("drops undefined environment values", () => {
    expect(normalizePtyEnvironment({ PATH: "tools", EMPTY: undefined })).toEqual({ PATH: "tools" });
  });

  it("forwards terminal output without changing agent exit status", async () => {
    const input = new EventEmitter() as NodeJS.ReadStream;
    Object.assign(input, { isRaw: false, resume: () => input, setRawMode: () => input });
    const writes: string[] = [];
    const output = { columns: 80, rows: 24, write: (value: string) => writes.push(value) } as unknown as NodeJS.WriteStream;
    const child: PtyProcessLike = {
      write: () => undefined,
      resize: () => undefined,
      kill: () => undefined,
      onData: (listener) => {
        queueMicrotask(() => listener("Thinking..."));
        return { dispose: () => undefined };
      },
      onExit: (listener) => {
        setTimeout(() => listener({ exitCode: 7 }), 0);
        return { dispose: () => undefined };
      },
    };
    await expect(runObservedCommand("agent", [], { input, output, spawn: () => child })).resolves.toBe(7);
    expect(writes).toEqual(["Thinking..."]);
  });
});
