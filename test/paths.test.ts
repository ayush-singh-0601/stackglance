import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolvePaths } from "../src/core/paths.js";

describe("resolvePaths", () => {
  it("honors an explicit isolated home", () => {
    const paths = resolvePaths({
      env: { STACKGLANCE_HOME: join("tmp", "stackglance") },
      platform: "linux",
    });
    expect(paths.config).toBe(join("tmp", "stackglance", "config.yaml"));
    expect(paths.database).toBe(join("tmp", "stackglance", "stackglance.sqlite"));
  });

  it("uses a named pipe on Windows", () => {
    const paths = resolvePaths({ env: {}, home: "C:\\Users\\dev", platform: "win32" });
    expect(paths.socket).toBe("\\\\.\\pipe\\stackglance");
    expect(paths.root).toContain("StackGlance");
  });

  it("uses the XDG state directory on Unix", () => {
    const paths = resolvePaths({
      env: { XDG_STATE_HOME: "/state" },
      home: "/home/dev",
      platform: "linux",
    });
    expect(paths.root).toBe(join("/state", "stackglance"));
  });
});
