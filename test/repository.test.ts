import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { detectRepository, findRepositoryRoot } from "../src/intelligence/repository.js";

describe("repository intelligence", () => {
  it("finds the root and extracts package technologies", async () => {
    const root = await mkdtemp(join(tmpdir(), "devradar-repo-"));
    const nested = join(root, "src", "feature");
    await mkdir(nested, { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ dependencies: { next: "15.0.0", "@prisma/client": "6.0.0" }, devDependencies: { typescript: "5" } }),
    );
    expect(await findRepositoryRoot(nested)).toBe(root);
    expect(await detectRepository(nested)).toMatchObject({
      root,
      technologies: ["next.js", "node", "prisma", "typescript"],
    });
  });
});
