export { GitError } from "./errors.js";
export type { GitErrorCode } from "./errors.js";

export { defaultGitRunner, type GitCommandOutput, type GitRunner } from "./runner.js";

export { isRepository, repositoryRoot } from "./root.js";

export { status, type GitStatus, type StatusCode, type StatusEntry } from "./status.js";

export { branches, currentBranch, syncState, type Branch, type SyncState } from "./branches.js";

export { diffStat, type DiffStat, type DiffStatEntry } from "./diff.js";
