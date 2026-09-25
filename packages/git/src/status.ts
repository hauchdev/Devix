import { defaultGitRunner, type GitRunner } from "./runner.js";
import { repositoryRoot } from "./root.js";

/** How a path changed relative to HEAD and the index. */
export type StatusCode =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "untracked"
  | "conflicted"
  | "typechange"
  | "other";

/** One changed path in the working tree. */
export interface StatusEntry {
  /** Path relative to the repository root (to-path for renames). */
  readonly path: string;
  /** Original path for renames and copies. */
  readonly originalPath?: string;
  /** How the index changed relative to HEAD. */
  readonly index: StatusCode;
  /** How the working tree changed relative to the index. */
  readonly workingTree: StatusCode;
  /** True when the entry is an unmerged (conflicted) path. */
  readonly conflicted: boolean;
}

/** Repository status: current branch plus changed paths. */
export interface GitStatus {
  /** Repository root the status was taken from. */
  readonly root: string;
  /** Current branch name, or undefined on a detached HEAD. */
  readonly branch?: string;
  /** True when HEAD exists (false right after git init). */
  readonly hasCommits: boolean;
  /** Changed paths, in porcelain order. */
  readonly entries: readonly StatusEntry[];
}

/**
 * Reads repository status via `git status --porcelain=v2 --branch`,
 * the machine-readable format with stable columns. Never shells out
 * with user input beyond fixed arguments: safe by construction.
 */
export async function status(
  directory: string,
  runner: GitRunner = defaultGitRunner,
): Promise<GitStatus> {
  const root = await repositoryRoot(directory, runner);
  const { stdout } = await runner.run(["status", "--porcelain=v2", "--branch"], root);

  const lines = stdout.split("\n").filter((line) => line.length > 0);

  let branch: string | undefined;
  let hasCommits = true;
  const entries: StatusEntry[] = [];

  for (const line of lines) {
    if (line.startsWith("# branch.head ")) {
      const head = line.slice("# branch.head ".length).trim();
      // "(detached)" marks a detached HEAD: no branch name to report.
      branch = head === "(detached)" ? undefined : head;
      continue;
    }
    if (line.startsWith("# branch.oid (initial)")) {
      hasCommits = false;
      continue;
    }
    if (line.startsWith("#")) {
      continue;
    }

    const entry = parseEntry(line);
    if (entry !== undefined) {
      entries.push(entry);
    }
  }

  return branch === undefined
    ? { root, hasCommits, entries }
    : { root, branch, hasCommits, entries };
}

function parseEntry(line: string): StatusEntry | undefined {
  // Untracked entries use a distinct prefix in porcelain v2.
  if (line.startsWith("? ")) {
    return {
      path: line.slice(2),
      index: "untracked",
      workingTree: "untracked",
      conflicted: false,
    };
  }

  if (line.startsWith("u ")) {
    return parseXYEntry(line, "conflicted", true);
  }

  if (line.startsWith("1 ")) {
    return parseXYEntry(line, undefined, false);
  }

  // Rename/copy entries ("2 ...") use the same XY statuses as "1": the
  // from-path (after the TAB in real output) is not reported here.
  if (line.startsWith("2 ")) {
    return parseXYEntry(line, undefined, false);
  }

  return undefined;
}

function parseXYEntry(
  line: string,
  forcedStatus: StatusCode | undefined,
  conflicted: boolean,
): StatusEntry | undefined {
  // Format: "<prefix> XY <rest...>"; for "1"/"2"/"u" the path starts
  // after the fields git documents for porcelain v2.
  const parts = line.split(" ");
  const xy = parts[1];
  if (xy === undefined || xy.length !== 2) {
    return undefined;
  }

  const path = extractPath(line);
  if (path === undefined) {
    return undefined;
  }

  return {
    path,
    index: forcedStatus ?? charToStatus(xy[0]),
    workingTree: forcedStatus ?? charToStatus(xy[1]),
    conflicted,
  };
}

function extractPath(line: string): string | undefined {
  // Porcelain v2 field counts before the path: "1 XY sub mH mI mW hH hI
  // <path>", "2 XY sub mH mI mW hH hI X<score> <path>" and "u XY sub m1
  // m2 m3 mW h1 h2 h3 <path>". Paths may contain spaces, so join
  // whatever remains.
  const fields = line.split(" ");
  if (line.startsWith("u ")) {
    return fields.slice(9).join(" ") || undefined;
  }
  if (line.startsWith("2 ")) {
    // Skip the X<score> field, then keep the to-path (the from-path
    // after the TAB is not reported by this reader).
    const toPath = fields.slice(9).join(" ").split("\t")[0];
    return toPath === "" ? undefined : toPath;
  }
  return fields.slice(8).join(" ") || undefined;
}

function charToStatus(char: string | undefined): StatusCode {
  switch (char) {
    case "A":
      return "added";
    case "M":
      return "modified";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    case "T":
      return "typechange";
    case "U":
      return "conflicted";
    case ".":
      return "other";
    default:
      return "other";
  }
}
