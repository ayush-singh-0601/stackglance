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
  spawn?: PtySpawn;
}

export async function runObservedCommand(
  command: string,
  args: readonly string[],
  options: ObservedCommandOptions = {},
): Promise<number> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const spawn: PtySpawn = options.spawn ?? ((file, values, settings) => nodePty.spawn(file, values, settings));
  const child = spawn(command, [...args], {
    name: options.env?.TERM ?? process.env.TERM ?? "xterm-256color",
    cols: output.columns ?? 80,
    rows: output.rows ?? 24,
    cwd: options.cwd ?? process.cwd(),
    env: normalizePtyEnvironment(options.env ?? process.env),
  });
  const wasRaw = input.isRaw;
  input.setRawMode?.(true);
  input.resume();
  const onInput = (data: Buffer | string): void => {
    const value = typeof data === "string" ? data : data.toString("utf8");
    const transformed = options.transformInput?.(value) ?? (options.transformInput === undefined ? value : undefined);
    if (transformed !== undefined) child.write(transformed);
  };
  const onResize = (): void => child.resize(output.columns ?? 80, output.rows ?? 24);
  input.on("data", onInput);
  process.on("SIGWINCH", onResize);
  const dataSubscription = child.onData((data) => {
    output.write(data);
    options.onOutput?.(data);
  });

  return new Promise<number>((resolve) => {
    const exitSubscription = child.onExit(({ exitCode }) => {
      dataSubscription.dispose();
      exitSubscription.dispose();
      input.off("data", onInput);
      process.off("SIGWINCH", onResize);
      input.setRawMode?.(wasRaw);
      resolve(exitCode);
    });
  });
}

export function normalizePtyEnvironment(environment: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(Object.entries(environment).filter((entry): entry is [string, string] => entry[1] !== undefined));
}
