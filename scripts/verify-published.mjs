#!/usr/bin/env node
/**
 * Post-publish verification.
 *
 * pnpm resolves `workspace:` when packing, so a leaked protocol only
 * shows up on the registry, where it becomes a broken install for
 * consumers. After publishing, this confirms every package that went out
 * is actually installable and carries concrete dependency ranges.
 *
 * Usage: node scripts/verify-published.mjs @devix-cli/core@0.1.1 ...
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const DEPENDENCY_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies"];

/**
 * Whether a missing attestation is a failure.
 *
 * On by default, because the release workflow publishes with provenance
 * and a tarball without one is indistinguishable from a tampered one.
 * Set DEVIX_SKIP_PROVENANCE_CHECK=1 to verify older versions that were
 * legitimately published before the workflow enabled it.
 */
const REQUIRE_PROVENANCE = process.env["DEVIX_SKIP_PROVENANCE_CHECK"] !== "1";

/** Splits `name@version`, tolerating scoped names. */
function parseSpec(spec) {
  const at = spec.lastIndexOf("@");
  if (at <= 0) {
    return { name: spec, version: "latest" };
  }
  return { name: spec.slice(0, at), version: spec.slice(at + 1) };
}

/** Reads one published manifest from the registry. */
async function fetchManifest(name, version) {
  // `npm` is a .cmd shim on Windows, which execFile cannot spawn without
  // a shell. The command and arguments are hardcoded registry lookups,
  // so the shell adds no injection surface — it only resolves the shim.
  const { stdout } = await run(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["view", `${name}@${version}`, "--json"],
    {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      ...(process.platform === "win32" ? { shell: true } : {}),
    },
  );

  const parsed = JSON.parse(stdout);
  // `npm view pkg@ver --json` returns a string when there is a single
  // field; ask for the fields we need explicitly when that happens.
  return typeof parsed === "string" ? { version: parsed } : parsed;
}

const specs = process.argv.slice(2);

if (specs.length === 0) {
  console.log("No packages to verify.");
  process.exit(0);
}

const problems = [];

for (const spec of specs) {
  const { name, version } = parseSpec(spec);

  let manifest;
  try {
    manifest = await fetchManifest(name, version);
  } catch (error) {
    // npm writes its own diagnostics to stderr, and its config warnings
    // come before the real error. Report the first line that is actually
    // an error, so a 404 reads as a 404.
    const detail = error.stderr
      ?.split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("npm error"));
    problems.push(`${name}@${version} is not readable on the registry: ${detail ?? error.message}`);
    continue;
  }

  const leaks = [];
  for (const field of DEPENDENCY_FIELDS) {
    const section = manifest?.[field];
    if (typeof section !== "object" || section === null || Array.isArray(section)) {
      continue;
    }
    for (const [dependency, range] of Object.entries(section)) {
      if (typeof range === "string" && range.includes("workspace:")) {
        leaks.push(`${field}.${dependency} = "${range}"`);
      }
    }
  }

  if (leaks.length > 0) {
    problems.push(
      `${name}@${version} leaked the workspace protocol:\n    - ${leaks.join("\n    - ")}`,
    );
    continue;
  }

  // Provenance is what lets a consumer trace a tarball back to the
  // workflow run that built it. It is easy to lose silently: the flag
  // has to reach `npm publish` through the environment, and nothing
  // fails when it does not. Checking the registry catches that, because
  // by this point the version is immutable and cannot be redone.
  if (REQUIRE_PROVENANCE && typeof manifest?.dist?.attestations?.url !== "string") {
    problems.push(
      `${name}@${version} published without provenance (no attestation on the registry)`,
    );
    continue;
  }

  console.log(`  v  ${name}@${version}`);
}

if (problems.length > 0) {
  console.error("");
  console.error("Published packages failed verification:");
  for (const problem of problems) {
    console.error(`  x ${problem}`);
  }
  process.exit(1);
}

console.log("");
console.log(`Verified ${specs.length} published package(s).`);
