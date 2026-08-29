import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import {
  childDimensions,
  NestedTerminalOutputFilter,
  normalizePtyEnvironment,
  runObservedCommand,
  type PtyProcessLike,
} from "../src/terminal/pty.js";

describe("PTY observation", () => {
  it("drops undefined environment values", () => {
    expect(normalizePtyEnvironment({ PATH: "tools", EMPTY: undefined })).toEqual({ PATH: "tools" });
  });

  it("reserves physical terminal rows for an external overlay", () => {
    expect(childDimensions({ columns: 120, rows: 40 }, 12)).toEqual({
      columns: 120,
      rows: 28,
    });
    expect(childDimensions({ columns: 80, rows: 10 }, 20)).toEqual({ columns: 80, rows: 1 });
  });

  it("blocks nested ConPTY resize requests without changing other output", () => {
    const filter = new NestedTerminalOutputFilter();
    expect(filter.push("before\u001b[8;10")).toBe("before");
    expect(filter.push(";80tafter\u001b[2J")).toBe("after\u001b[2J");
    expect(filter.flush()).toBe("");
  });

  it("flushes an incomplete terminal sequence instead of losing agent output", () => {
    const filter = new NestedTerminalOutputFilter();
    expect(filter.push("text\u001b[8;10")).toBe("text");
    expect(filter.flush()).toBe("\u001b[8;10");
  });

  it("forwards terminal output without changing agent exit status", async () => {
    const input = new EventEmitter() as NodeJS.ReadStream;
    Object.assign(input, { isRaw: false, resume: () => input, setRawMode: () => input });
    const writes: string[] = [];
    const output = {
      columns: 80,
      rows: 24,
      write: (value: string) => writes.push(value),
    } as unknown as NodeJS.WriteStream;
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
    let resize: (() => void) | undefined;
    let reservedRows = 0;
    const childSizes: Array<[number, number]> = [];
    child.resize = (columns, rows) => childSizes.push([columns, rows]);
    const execution = runObservedCommand("agent", [], {
      input,
      output,
      reservedRows: () => reservedRows,
      onStart: (control) => {
        resize = () => control.resize();
      },
      spawn: (_file, _args, options) => {
        childSizes.push([options.cols, options.rows]);
        return child;
      },
    });
    reservedRows = 8;
    resize?.();
    await expect(execution).resolves.toBe(7);
    expect(writes).toEqual(["Thinking..."]);
    expect(childSizes).toEqual([
      [80, 24],
      [80, 16],
    ]);
    expect(resize).toBeTypeOf("function");
  });
});
