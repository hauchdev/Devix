import { GitError } from "./errors.js";

/** Result of a successful git invocation. */
export interface GitCommandOutput {
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * How the git API executes git commands. Injectable so tests run
 * without a real git binary or repository.
 */
export interface GitRunner {
  /** Runs `git <args>` in `cwd`; resolves with the command output. */
  run(args: readonly string[], cwd: string): Promise<GitCommandOutput>;
}

/**
 * Default runner over @devix/shell: no shell concat, argv array only,
 * generous but bounded timeout, and typed errors for git absence and
 * non-zero exits.
 */
export const defaultGitRunner: GitRunner = {
  async run(args: readonly string[], cwd: string): Promise<GitCommandOutput> {
    const { commandExists, runCommand } = await import("@devix/shell");

    if (!(await commandExists("git"))) {
      throw GitError.gitNotFound();
    }

    const result = await runCommand("git", args, { cwd, timeoutMs: 30_000 });
    if (result.exitCode !== 0) {
      throw GitError.commandFailed(args[0] ?? "", result.exitCode ?? 1, result.stderr);
    }
    return { stdout: result.stdout, stderr: result.stderr };
  },
};
