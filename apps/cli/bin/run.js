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

const argv = process.argv.slice(2);

// With no command oclif prints its help text, which is a reference
// rather than an introduction: it lists what exists without saying
// anything about where the user is. `devix home` is that introduction,
// so it is what a bare `devix` runs.
//
// The check is on the first *command* rather than on argv being empty,
// because `devix --no-color` is the same request with a flag attached,
// and inserting `home` ahead of it would make oclif read the flag as a
// command name. Only the flags oclif itself handles are left alone, so
// `devix --help` and `devix --version` keep their own behaviour.
const OCLIF_OWN_FLAGS = new Set(["--help", "--version"]);

const startsWithCommand =
  argv.length === 0 || (argv[0]?.startsWith("-") === true && !OCLIF_OWN_FLAGS.has(argv[0]));

const args = startsWithCommand ? ["home", ...argv] : argv;

await execute({
  args,
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
