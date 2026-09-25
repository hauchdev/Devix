#!/usr/bin/env node
import { execute } from "@oclif/core";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// oclif detects the user's shell to show help snippets. On Windows it
// spawns PowerShell and queries Win32_Process via CIM, costing ~300ms
// on every cold start. oclif trusts the SHELL env var when present, so
// default it to COMSPEC on Windows and skip that probe entirely.
// POSIX systems always have SHELL set, so they are unaffected.
if (process.platform === "win32" && !process.env.SHELL) {
  process.env.SHELL = process.env.COMSPEC ?? "cmd.exe";
}

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");

await execute({
  dir: packageDir,
  loadOptions: { root: packageDir, pjson: packageJson() },
}).then(
  (result) => {
    if (result?.error) {
      process.exitCode = result.error.oclif?.exit ?? 1;
    }
  },
  (error) => {
    process.exitCode = error.oclif?.exit ?? 1;
  },
);

/** Reads the CLI package.json so oclif can resolve its manifest. */
function packageJson() {
  return createRequire(import.meta.url)("../package.json");
}
