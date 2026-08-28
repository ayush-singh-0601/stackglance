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
    const root = await mkdtemp(join(tmpdir(), "stackglance-shims-"));
    const paths = resolvePaths({ env: { STACKGLANCE_HOME: root } });
    const installed = await installShellShims(paths, ["codex"]);
    expect(await readFile(installed[0]!.unix, "utf8")).toContain('stackglance agent codex "$@"');
    expect(await readFile(installed[0]!.windows, "utf8")).toContain("stackglance agent codex %*");
  });

  it("adds and removes only the exact shim directory from PATH", () => {
    const original = [join("tools", "one"), join("tools", "two")].join(delimiter);
    const withShims = pathWithShims(original, join("stackglance", "bin"));
    expect(withShims.split(delimiter)[0]).toBe(join("stackglance", "bin"));
    expect(pathWithoutShims(withShims, join("stackglance", "bin"))).toBe(original);
  });

  it("activates shims idempotently in supported shell profiles", async () => {
    const home = await mkdtemp(join(tmpdir(), "stackglance-shell-profile-"));
    const paths = resolvePaths({
      env: { STACKGLANCE_HOME: join(home, "state") },
      platform: "linux",
    });
    const targets = await installShellActivation(paths, { home, platform: "linux" });
    await installShellActivation(paths, { home, platform: "linux" });
    const profile = await readFile(targets[0]!, "utf8");
    expect(profile.match(/>>> stackglance >>>/gu)).toHaveLength(1);
    expect(profile).toContain(paths.bin);
  });
});
