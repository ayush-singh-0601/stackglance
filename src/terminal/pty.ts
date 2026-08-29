import type { IDisposable } from "node-pty";
import * as nodePty from "node-pty";

export interface PtyProcessLike {
  write(data: string): void;
  resize(columns: number, rows: number): void;
  kill(signal?: string): void;
  onData(listener: (data: string) => void): IDisposable;
  onExit(listener: (event: { exitCode: number; signal?: number }) => void): IDisposable;
}

export interface PtySpawnOptions {
  name: string;
  cols: number;
  rows: number;
  cwd: string;
  env: Record<string, string>;
}

export type PtySpawn = (file: string, args: string[], options: PtySpawnOptions) => PtyProcessLike;

export interface ObservedCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: NodeJS.ReadStream;
  output?: NodeJS.WriteStream;
  onOutput?: (data: string) => void;
  transformInput?: (data: string) => string | undefined;
  reservedRows?: () => number;
  onStart?: (control: ObservedCommandControl) => void;
  onResize?: () => void;
  spawn?: PtySpawn;
}

export interface ObservedCommandControl {
  resize(): void;
}

export class NestedTerminalOutputFilter {
  private pending = "";

  push(data: string): string {
    const input = this.pending + data;
    this.pending = "";
    let output = "";
    let cursor = 0;

    while (cursor < input.length) {
      const escape = input.indexOf("\u001b", cursor);
      if (escape === -1) return output + input.slice(cursor);
      output += input.slice(cursor, escape);
      if (escape + 1 >= input.length) {
        this.pending = input.slice(escape);
        return output;
      }
      if (input[escape + 1] !== "[") {
        output += "\u001b";
        cursor = escape + 1;
        continue;
      }

      let end = escape + 2;
      while (end < input.length && !isCsiFinal(input.charCodeAt(end))) end += 1;
      if (end >= input.length) {
        this.pending = input.slice(escape);
        return output;
      }

      const sequence = input.slice(escape, end + 1);
      if (!/^\[8;\d+;\d+t$/u.test(sequence.slice(1))) output += sequence;
      cursor = end + 1;
    }

    return output;
  }

  flush(): string {
    const value = this.pending;
    this.pending = "";
    return value;
  }
}

export async function runObservedCommand(
  command: string,
  args: readonly string[],
  options: ObservedCommandOptions = {},
): Promise<number> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const spawn: PtySpawn =
    options.spawn ?? ((file, values, settings) => nodePty.spawn(file, values, settings));
  const dimensions = childDimensions(output, options.reservedRows?.() ?? 0);
  const child = spawn(command, [...args], {
    name: options.env?.TERM ?? process.env.TERM ?? "xterm-256color",
    cols: dimensions.columns,
    rows: dimensions.rows,
    cwd: options.cwd ?? process.cwd(),
    env: normalizePtyEnvironment(options.env ?? process.env),
  });
  const wasRaw = input.isRaw;
  input.setRawMode?.(true);
  input.resume();
  const onInput = (data: Buffer | string): void => {
    const value = typeof data === "string" ? data : data.toString("utf8");
    const transformed =
      options.transformInput?.(value) ?? (options.transformInput === undefined ? value : undefined);
    if (transformed !== undefined) child.write(transformed);
  };
  const onResize = (): void => {
    const next = childDimensions(output, options.reservedRows?.() ?? 0);
    child.resize(next.columns, next.rows);
    options.onResize?.();
  };
  options.onStart?.({ resize: onResize });
  input.on("data", onInput);
  process.on("SIGWINCH", onResize);
  const outputFilter = new NestedTerminalOutputFilter();
  const dataSubscription = child.onData((data) => {
    const visible = outputFilter.push(data);
    if (visible !== "") output.write(visible);
    options.onOutput?.(data);
  });

  return new Promise<number>((resolve) => {
    const exitSubscription = child.onExit(({ exitCode }) => {
      const trailing = outputFilter.flush();
      if (trailing !== "") output.write(trailing);
      dataSubscription.dispose();
      exitSubscription.dispose();
      input.off("data", onInput);
      process.off("SIGWINCH", onResize);
      input.setRawMode?.(wasRaw);
      resolve(exitCode);
    });
  });
}

function isCsiFinal(code: number): boolean {
  return code >= 0x40 && code <= 0x7e;
}

export function childDimensions(
  output: Pick<NodeJS.WriteStream, "columns" | "rows">,
  reservedRows: number,
): { columns: number; rows: number } {
  return {
    columns: Math.max(1, output.columns ?? 80),
    rows: Math.max(1, (output.rows ?? 24) - Math.max(0, reservedRows)),
  };
}

export function normalizePtyEnvironment(environment: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(environment).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}
