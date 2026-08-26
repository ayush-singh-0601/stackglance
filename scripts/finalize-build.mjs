import { readFile, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = new URL("../dist/", import.meta.url);
const files = (await readdir(outputDirectory)).filter((name) => name.endsWith(".js"));
let sqliteImportFound = false;

for (const name of files) {
  const path = new URL(name, outputDirectory);
  const source = await readFile(path, "utf8");
  const fixed = source.replaceAll('from "sqlite"', 'from "node:sqlite"');
  if (fixed.includes('from "node:sqlite"')) sqliteImportFound = true;
  if (fixed !== source) await writeFile(path, fixed, "utf8");
}

if (!sqliteImportFound) throw new Error("Built output did not preserve the node:sqlite import");

const cli = join(fileURLToPath(outputDirectory), "cli.js");
const smoke = spawnSync(process.execPath, [cli, "--version"], {
  encoding: "utf8",
  windowsHide: true,
});
if (smoke.status !== 0 || smoke.stdout.trim() !== "0.1.0") {
  throw new Error(`Packaged CLI smoke test failed: ${smoke.stderr || smoke.stdout}`);
}
