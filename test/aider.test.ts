import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { classifyAiderOutput, installAiderIntegration } from "../src/integrations/aider.js";

describe("Aider integration", () => {
  it("configures the documented ready notification without replacing a user command", async () => {
    const home = await mkdtemp(join(tmpdir(), "devradar-aider-"));
    expect(await installAiderIntegration(home)).toMatchObject({ notificationConfigured: true });
    expect(await readFile(join(home, ".aider.conf.yml"), "utf8")).toContain(
      "devradar hook aider waiting_for_user",
    );

    const customHome = await mkdtemp(join(tmpdir(), "devradar-aider-custom-"));
    await writeFile(join(customHome, ".aider.conf.yml"), "notifications-command: custom-alert\n");
    expect(await installAiderIntegration(customHome)).toMatchObject({
      notificationConfigured: false,
    });
    expect(await readFile(join(customHome, ".aider.conf.yml"), "utf8")).toContain("custom-alert");
  });

  it("classifies observed PTY output conservatively", () => {
    expect(classifyAiderOutput("Thinking about the repository...")).toBe("agent_thinking");
    expect(classifyAiderOutput("Running pytest...")).toBe("running_tests");
    expect(classifyAiderOutput("\n> ")).toBe("waiting_for_user");
    expect(classifyAiderOutput("ordinary model output")).toBeUndefined();
  });
});
