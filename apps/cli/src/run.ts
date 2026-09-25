import { execute } from "@oclif/core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Runs the Devix CLI programmatically.
 *
 * Used by tests; the executable entry point is `bin/run.js`.
 */
export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
  await execute({ args: argv, dir: packageDir });
}
