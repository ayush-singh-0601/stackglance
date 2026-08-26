import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type { RepositoryContext } from "../core/types.js";

const ROOT_MARKERS = [".git", "package.json", "pyproject.toml", "Cargo.toml", "go.mod"] as const;

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function findRepositoryRoot(cwd: string): Promise<string> {
  let current = resolve(cwd);
  while (true) {
    for (const marker of ROOT_MARKERS) {
      if (await exists(join(current, marker))) return current;
    }
    const parent = dirname(current);
    if (parent === current) return resolve(cwd);
    current = parent;
  }
}

export async function detectRepository(cwd: string): Promise<RepositoryContext> {
  const root = await findRepositoryRoot(cwd);
  const technologies = new Set<string>();
  const dependencies: Record<string, string> = {};

  if (await exists(join(root, "package.json"))) {
    technologies.add("node");
    const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    Object.assign(dependencies, manifest.dependencies, manifest.devDependencies);
    for (const name of Object.keys(dependencies)) technologies.add(normalizeTechnology(name));
  }
  if (await exists(join(root, "pyproject.toml"))) technologies.add("python");
  if (await exists(join(root, "Cargo.toml"))) technologies.add("rust");
  if (await exists(join(root, "go.mod"))) technologies.add("go");

  return { root, technologies: [...technologies].sort(), dependencies };
}

function normalizeTechnology(name: string): string {
  const aliases: Record<string, string> = {
    "@prisma/client": "prisma",
    "@playwright/test": "playwright",
    "next": "next.js",
    "react": "react",
    "typescript": "typescript",
  };
  return aliases[name] ?? name.replace(/^@/, "").split("/")[0]!;
}
