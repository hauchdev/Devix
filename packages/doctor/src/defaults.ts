import { runCommand, which } from "@devix-cli/shell";

import { withCachedTools } from "./cached.js";
import type { DoctorServices } from "./types.js";

/** How a tool probe reaches the machine. */
export interface ToolProbe {
  /** Resolves an executable, or `undefined` when it is not on PATH. */
  resolve(command: string): Promise<string | undefined>;
  /** Runs `<command> <arg>` and returns its first version token. */
  version(command: string, versionArg: string): Promise<string | undefined>;
}

/** Result of one delegated command. */
export interface ProbeResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Extracts the first version-looking token from tool output.
 *
 * Tools disagree on the shape (`v22.20.4`, `git version 2.47.1`, npm's
 * `10.9.0`), so matching a numeric token rather than parsing a format is
 * what keeps one implementation working for all of them.
 */
export function parseVersionOutput(output: string): string | undefined {
  const match = /\d+\.\d+[\w.\-+]*/.exec(output.trim());
  return match?.[0];
}

/**
 * Builds tool probes over an injected runner.
 *
 * Every failure resolves to `undefined`: a missing tool is a `missing`
 * check, never a thrown error.
 */
export function createToolProbe(
  run: (command: string, args: readonly string[]) => Promise<ProbeResult>,
): ToolProbe {
  return {
    async resolve(command: string): Promise<string | undefined> {
      return which(command);
    },

    async version(command: string, versionArg: string): Promise<string | undefined> {
      let result: ProbeResult;
      try {
        result = await run(command, [versionArg]);
      } catch {
        // A spawn failure or timeout is a missing version, not an error.
        return undefined;
      }

      if (result.exitCode !== 0) {
        return undefined;
      }

      return parseVersionOutput(result.stdout) ?? parseVersionOutput(result.stderr);
    },
  };
}

/**
 * The production probe: real processes with a timeout.
 *
 * Results are cached with a short TTL so repeated runs (and `devix
 * status`, which also reports the environment) do not re-spawn every
 * tool. Only successful probes are cached.
 */
export const defaultServices: DoctorServices = withCachedTools({
  async getToolVersion(tool: string, versionArg: string): Promise<string | undefined> {
    const probe = createToolProbe(async (command, args) => {
      const result = await runCommand(command, [...args], { timeoutMs: 10_000 });
      return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
    });

    const executable = await probe.resolve(tool);
    if (executable === undefined) {
      return undefined;
    }

    return probe.version(tool, versionArg);
  },
});
