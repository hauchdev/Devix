import { resolve } from "node:path";

import { defaultGitRunner, type GitRunner } from "./runner.js";

/**
 * Resolves the repository root containing `directory`.
 *
 * Uses `git rev-parse --show-toplevel`, so worktrees resolve to their
 * worktree root. Throws `EGIT_NOT_A_REPO` when the directory is not
 * inside a repository.
 */
export async function repositoryRoot(
  directory: string,
  runner: GitRunner = defaultGitRunner,
): Promise<string> {
  try {
    const { stdout } = await runner.run(["rev-parse", "--show-toplevel"], directory);
    // Git prints forward slashes on every platform; normalize so the
    // result compares equal to native paths (Windows backslashes).
    return resolve(stdout.trim());
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "EGIT_FAILED"
    ) {
      throw Object.assign(error, { message: `not a git repository: ${directory}` });
    }
    throw error;
  }
}

/**
 * True when `directory` is inside a git repository (never throws for
 * the not-a-repo case: that is a negative answer, not a failure).
 */
export async function isRepository(
  directory: string,
  runner: GitRunner = defaultGitRunner,
): Promise<boolean> {
  try {
    await repositoryRoot(directory, runner);
    return true;
  } catch {
    return false;
  }
}
