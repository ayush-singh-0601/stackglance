import { describe, expect, it } from "vitest";

import { runCli, type CliIo } from "../src/cli/run.js";

function capture(): { io: CliIo; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      stdout: { write: (value) => stdout.push(String(value)) },
      stderr: { write: (value) => stderr.push(String(value)) },
    },
    stdout,
    stderr,
  };
}

describe("runCli", () => {
  it("prints command help by default", async () => {
    const output = capture();
    await expect(runCli([], output.io)).resolves.toBe(0);
    expect(output.stdout.join("")).toContain("stackglance <command>");
  });

  it("prints the package version", async () => {
    const output = capture();
    await expect(runCli(["--version"], output.io)).resolves.toBe(0);
    expect(output.stdout.join("")).toBe("0.1.4\n");
  });

  it("uses exit code two for an unknown command", async () => {
    const output = capture();
    await expect(runCli(["wat"], output.io)).resolves.toBe(2);
    expect(output.stderr.join("")).toContain("Unknown command: wat");
  });
});
