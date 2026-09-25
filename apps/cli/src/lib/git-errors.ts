import { GitError } from "@devix/git";

/**
 * Maps a GitError to a short user-facing message. Unknown errors are
 * rethrown so unexpected failures keep their real stack.
 */
export function gitErrorHint(error: unknown): string {
  if (error instanceof GitError) {
    switch (error.code) {
      case "EGIT_NOT_A_REPO":
        return "not a git repository";
      case "EGIT_NOT_FOUND":
        return "git executable not found on PATH";
      case "EGIT_FAILED":
        return error.message;
      default:
        return error.message;
    }
  }
  throw error;
}
