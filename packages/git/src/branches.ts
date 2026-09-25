import { defaultGitRunner, type GitRunner } from "./runner.js";
import { repositoryRoot } from "./root.js";

/** One local or remote branch. */
export interface Branch {
  /** Full ref name, e.g. "main" or "origin/main". */
  readonly name: string;
  /** Commit the branch points to. */
  readonly commit: string;
  /** True when this is the checked-out branch. */
  readonly current: boolean;
}

/**
 * Lists local branches via `git for-each-ref refs/heads`, with the
 * current one marked. Read-only and deterministic.
 */
export async function branches(
  directory: string,
  runner: GitRunner = defaultGitRunner,
): Promise<Branch[]> {
  const root = await repositoryRoot(directory, runner);
  const { stdout } = await runner.run(
    ["for-each-ref", "refs/heads", "--format=%(refname:short)%09%(objectname)"],
    root,
  );
  const { currentBranchName } = await currentBranch(root, runner);

  return stdout
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const separator = line.indexOf("\t");
      const name = line.slice(0, separator);
      const commit = line.slice(separator + 1);
      return { name, commit, current: name === currentBranchName };
    });
}

/**
 * The checked-out branch name, or `undefined` on a detached HEAD.
 */
export async function currentBranch(
  directory: string,
  runner: GitRunner = defaultGitRunner,
): Promise<{ currentBranchName: string | undefined }> {
  const root = await repositoryRoot(directory, runner);
  const { stdout } = await runner.run(["branch", "--show-current"], root);
  const name = stdout.trim();
  return { currentBranchName: name.length > 0 ? name : undefined };
}
