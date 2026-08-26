import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolvePaths } from "../src/core/paths.js";

describe("resolvePaths", () => {
  it("honors an explicit isolated home", () => {
    const paths = resolvePaths({ env: { DEVRADAR_HOME: join("tmp", "radar") }, platform: "linux" });
    expect(paths.config).toBe(join("tmp", "radar", "config.yaml"));
    expect(paths.database).toBe(join("tmp", "radar", "devradar.sqlite"));
  });

  it("uses a named pipe on Windows", () => {
    const paths = resolvePaths({ env: {}, home: "C:\\Users\\dev", platform: "win32" });
    expect(paths.socket).toBe("\\\\.\\pipe\\devradar");
    expect(paths.root).toContain("DevRadar");
  });

  it("uses the XDG state directory on Unix", () => {
    const paths = resolvePaths({ env: { XDG_STATE_HOME: "/state" }, home: "/home/dev", platform: "linux" });
    expect(paths.root).toBe(join("/state", "devradar"));
  });
});
