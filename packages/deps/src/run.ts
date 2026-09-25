import { detectPackageManager, type PackageManager } from "./detect.js";
import { DepsError } from "./errors.js";

/**
 * How deps commands execute. Injectable so tests run without real
 * package managers installed.
 */
export interface DepsRunner {
  run(manager: PackageManager, args: readonly string[], cwd: string): Promise<CommandOutput>;
}

export interface CommandOutput {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

/**
 * Read-only operations each package manager supports, mapped to their
 * native arguments. Devix delegates parsing to the manager itself
 * instead of reimplementing registry clients.
 */
const COMMAND_ARGS: Record<
  PackageManager,
  Record<"list" | "outdated" | "audit", readonly string[]>
> = {
  npm: {
    list: ["ls", "--depth=0"],
    outdated: ["outdated"],
    audit: ["audit"],
  },
  pnpm: {
    list: ["list", "--depth=0"],
    outdated: ["outdated"],
    audit: ["audit"],
  },
  yarn: {
    list: ["list", "--depth=0"],
    outdated: ["outdated"],
    audit: ["audit"],
  },
  bun: {
    list: ["pm", "ls"],
    outdated: ["outdated"],
    audit: ["audit"],
  },
};

/**
 * Runs a read-only dependency command through the detected package
 * manager. The manager's exit code is returned as-is: `npm outdated`,
 * for example, exits 1 when there are outdated packages, which is a
 * result rather than a failure.
 */
export async function runDepsCommand(
  directory: string,
  command: "list" | "outdated" | "audit",
  runner: DepsRunner = defaultDepsRunner,
): Promise<{ manager: PackageManager; output: CommandOutput }> {
  const manager = await detectPackageManager(directory);
  const args = COMMAND_ARGS[manager][command];

  const output = await runner.run(manager, args, directory);
  return { manager, output };
}

/**
 * Default execution over @devix/shell: argv arrays only, bounded
 * timeout, no shell concat.
 */
export const defaultDepsRunner: DepsRunner = {
  async run(manager, args, cwd) {
    const { commandExists, runCommand } = await import("@devix/shell");

    if (!(await commandExists(manager))) {
      throw DepsError.pmNotFound(manager);
    }

    const result = await runCommand(manager, args, { cwd, timeoutMs: 120_000 });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? 1,
    };
  },
};
