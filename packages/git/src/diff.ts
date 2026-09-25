import { defaultGitRunner, type GitRunner } from "./runner.js";
import { repositoryRoot } from "./root.js";

/** Added/deleted line counts for one file. */
export interface DiffStatEntry {
  readonly path: string;
  readonly additions: number;
  readonly deletions: number;
  /** True for binary files (git reports "-" for both counts). */
  readonly binary: boolean;
}

/** Working-tree diff against HEAD, reduced to per-file line counts. */
export interface DiffStat {
  readonly entries: readonly DiffStatEntry[];
}

/**
 * Reads the working-tree diff against HEAD as per-file line counts
 * via `git diff HEAD --numstat`. Read-only by design: this API never
 * mutates the repository.
 */
export async function diffStat(
  directory: string,
  runner: GitRunner = defaultGitRunner,
): Promise<DiffStat> {
  const root = await repositoryRoot(directory, runner);
  const { stdout } = await runner.run(["diff", "HEAD", "--numstat"], root);

  const entries: DiffStatEntry[] = [];
  for (const line of stdout.split("\n")) {
    if (line.trim().length === 0) {
      continue;
    }
    const [additions, deletions, path] = line.split("\t");
    if (path === undefined) {
      continue;
    }
    const binary = additions === "-";
    entries.push({
      path,
      additions: binary ? 0 : Number.parseInt(additions ?? "0", 10),
      deletions: binary ? 0 : Number.parseInt(deletions ?? "0", 10),
      binary,
    });
  }

  return { entries };
}
