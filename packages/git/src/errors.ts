/**
 * Typed error hierarchy for the @devix/git package.
 */

export type GitErrorCode = "EGIT_NOT_FOUND" | "EGIT_NOT_A_REPO" | "EGIT_FAILED" | "EINVALID";

/**
 * Base error for exceptional git failures in Devix.
 *
 * Git absence and non-repository directories are exceptional for the
 * API caller (they cannot read a repo that is not there), unlike the
 * detector's "not found is not an error" rule: git operations are
 * explicit requests.
 */
export class GitError extends Error {
  /** Machine-readable reason. */
  readonly code: GitErrorCode;

  private constructor(code: GitErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GitError";
    this.code = code;
  }

  /** The git executable is not available on this machine. */
  static gitNotFound(): GitError {
    return new GitError("EGIT_NOT_FOUND", "git executable not found on PATH");
  }

  /** The working directory is not inside a git repository. */
  static notARepo(directory: string): GitError {
    return new GitError("EGIT_NOT_A_REPO", `not a git repository: ${directory}`);
  }

  /** A git command exited non-zero. */
  static commandFailed(command: string, exitCode: number, stderr: string): GitError {
    const detail = stderr.trim().length > 0 ? stderr.trim() : `exit code ${exitCode}`;
    return new GitError("EGIT_FAILED", `git ${command} failed: ${detail}`);
  }

  /** Invalid usage of the API itself. */
  static invalid(message: string): GitError {
    return new GitError("EINVALID", message);
  }
}
