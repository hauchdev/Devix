#!/usr/bin/env node
/**
 * Packaging guard.
 *
 * What npm will actually ship is decided by the `files` field, not by
 * what exists on disk. A package can declare `LICENSE` in `files` and
 * still ship without one, because the file was never created — a
 * mistake that is invisible until it is on the registry, and permanent
 * once it is, since a version cannot be republished.
 *
 * So this packs every publishable package with `--dry-run` and fails
 * when a tarball is missing its build output, its README or its
 * license. Run before `changeset publish`, not after.
 *
 * Usage: node scripts/pack-report.mjs
 */

import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// `npm` is a .cmd shim on Windows, which spawnSync refuses to run
// (EINVAL). The command and its arguments are both hardcoded, so a shell
// adds no injection surface here — it only resolves the shim.
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

/**
 * Every package that reaches the registry.
 *
 * Kept explicit rather than globbed: a package missing from this list
 * is one nobody is testing, and a glob would silently include the
 * private root without failing.
 */
const PACKAGES = [
  "packages/core",
  "packages/filesystem",
  "packages/shell",
  "packages/config",
  "packages/project-detector",
  "packages/git",
  "packages/doctor",
  "packages/deps",
  "packages/cache",
  "packages/output",
  "packages/ui",
  "packages/logger",
  "plugins/docker",
  "plugins/minecraft",
  "plugins/web",
  "apps/cli",
];

const rows = [];
const problems = [];

for (const relative of PACKAGES) {
  const cwd = join(repoRoot, relative);

  let entry;
  try {
    const raw = execFileSync(npm, ["pack", "--dry-run", "--json"], {
      cwd,
      encoding: "utf8",
      shell: true,
      maxBuffer: 16 * 1024 * 1024,
    });
    const parsed = JSON.parse(raw);
    entry = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
  } catch (error) {
    problems.push(`${relative}: npm pack failed — ${error.message}`);
    continue;
  }

  const files = (entry.files ?? []).map((file) => file.path);
  const dist = files.filter((file) => file.startsWith("dist/")).length;
  const readme = files.some((file) => file.toLowerCase() === "readme.md");
  const license = files.some((file) => /^licen[cs]e/i.test(file));

  // A package with no dist either ships nothing or is source-only by
  // design; either way it is not what a consumer can run.
  if (dist === 0) problems.push(`${entry.id}: the tarball has no dist/ files`);
  if (!readme) problems.push(`${entry.id}: the tarball has no README.md`);
  if (!license) problems.push(`${entry.id}: the tarball has no LICENSE`);

  rows.push({
    id: entry.id,
    files: entry.entryCount,
    dist,
    readme,
    license,
    kb: entry.unpackedSize / 1024,
  });
}

const width = Math.max(...rows.map((row) => row.id.length));
for (const row of rows) {
  console.log(
    `${row.id.padEnd(width)}  files=${String(row.files).padStart(4)}  dist=${String(row.dist).padStart(4)}  ` +
      `readme=${row.readme ? "y" : "n"}  license=${row.license ? "y" : "n"}  ${row.kb.toFixed(0).padStart(4)}kB`,
  );
}

if (problems.length > 0) {
  console.error("");
  console.error("Tarballs failed packaging verification:");
  for (const problem of problems) {
    console.error(`  x ${problem}`);
  }
  process.exit(1);
}

console.log("");
console.log(`Verified the tarball contents of ${rows.length} package(s).`);
