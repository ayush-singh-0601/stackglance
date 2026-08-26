import { describe, expect, it } from "vitest";

import { OsvCollector } from "../src/feeds/osv.js";

describe("OSV ingestion", () => {
  it("queries project dependencies and maps advisories", async () => {
    const collector = new OsvCollector(
      { root: "/project", technologies: ["react"], dependencies: { react: "^19.0.0" } },
      (url, options) => {
        expect(url).toBe("https://api.osv.dev/v1/querybatch");
        expect(options.method).toBe("POST");
        expect(options.body).toContain('"version":"19.0.0"');
        return Promise.resolve({
          url,
          status: 200,
          headers: {},
          body: JSON.stringify({
            results: [{ vulns: [{ id: "GHSA-test", summary: "Authorization bypass", modified: "2026-08-26T00:00:00Z" }] }],
          }),
        });
      },
    );
    await expect(collector.collect()).resolves.toMatchObject([
      { sourceId: "GHSA-test:react", category: "security", metadata: { dependency: "react" } },
    ]);
  });
});
