import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolvePaths } from "../src/core/paths.js";
import {
  installShellActivation,
  installShellShims,
  pathWithShims,
  pathWithoutShims,
} from "../src/integrations/shims.js";

describe("transparent shell shims", () => {
  it("installs fixed-argument shims without shell interpolation", async () => {
    const root = await mkdtemp(join(tmpdir(), "devradar-shims-"));
    const paths = resolvePaths({ env: { DEVRADAR_HOME: root } });
    const installed = await installShellShims(paths, ["codex"]);
    expect(await readFile(installed[0]!.unix, "utf8")).toContain('devradar agent codex "$@"');
    expect(await readFile(installed[0]!.windows, "utf8")).toContain("devradar agent codex %*");
  });

  it("adds and removes only the exact shim directory from PATH", () => {
    const original = [join("tools", "one"), join("tools", "two")].join(delimiter);
    const withShims = pathWithShims(original, join("radar", "bin"));
    expect(withShims.split(delimiter)[0]).toBe(join("radar", "bin"));
    expect(pathWithoutShims(withShims, join("radar", "bin"))).toBe(original);
  });

  it("activates shims idempotently in supported shell profiles", async () => {
    const home = await mkdtemp(join(tmpdir(), "devradar-shell-profile-"));
    const paths = resolvePaths({ env: { DEVRADAR_HOME: join(home, "state") }, platform: "linux" });
    const targets = await installShellActivation(paths, { home, platform: "linux" });
    await installShellActivation(paths, { home, platform: "linux" });
    const profile = await readFile(targets[0]!, "utf8");
    expect(profile.match(/>>> devradar >>>/gu)).toHaveLength(1);
    expect(profile).toContain(paths.bin);
  });
});
