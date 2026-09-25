import { runCommand, which } from "@devix-cli/shell";

import type { DoctorServices } from "./types.js";

/** Extracts the first version-looking token from tool output. */
function parseVersionOutput(output: string): string | undefined {
  const match = /\d+\.\d+[\w.\-+]*/.exec(output.trim());
  return match?.[0];
}

/**
 * Default tool probe: resolves the executable and, when present, runs
 * `<tool> --version` capturing its first version token. Missing tools
 * resolve to `undefined` (a `missing` check), never to thrown errors.
 */
export const defaultServices: DoctorServices = {
  async getToolVersion(tool: string, versionArg: string): Promise<string | undefined> {
    const executable = await which(tool);
    if (executable === undefined) {
      return undefined;
    }

    try {
      const result = await runCommand(tool, [versionArg], { timeoutMs: 10_000 });
      if (result.exitCode !== 0) {
        return undefined;
      }
      return parseVersionOutput(result.stdout) ?? parseVersionOutput(result.stderr);
    } catch {
      return undefined;
    }
  },
};
