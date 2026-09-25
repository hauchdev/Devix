#!/usr/bin/env node
import { execute } from "@oclif/core";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
