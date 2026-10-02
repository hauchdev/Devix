import { describe, expect, it } from "vitest";

import { GitError } from "../src/index.js";

describe("GitError", () => {
  it("reports a missing executable", () => {
    const error = GitError.gitNotFound();

    expect(error).toBeInstanceOf(GitError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("GitError");
    expect(error.code).toBe("EGIT_NOT_FOUND");
    expect(error.message).toContain("PATH");
  });

  it("names the directory that is not a repository", () => {
    const error = GitError.notARepo("/tmp/plain");

    expect(error.code).toBe("EGIT_NOT_A_REPO");
    expect(error.message).toContain("/tmp/plain");
  });

  it("prefers stderr as the failure detail", () => {
    const error = GitError.commandFailed("status", 128, "fatal: not a git repository");

    expect(error.code).toBe("EGIT_FAILED");
    expect(error.message).toBe("git status failed: fatal: not a git repository");
  });

  it("falls back to the exit code when stderr is blank", () => {
    const error = GitError.commandFailed("fetch", 1, "   \n  ");

    expect(error.message).toBe("git fetch failed: exit code 1");
  });

  it("falls back to the exit code when stderr is empty", () => {
    expect(GitError.commandFailed("fetch", 2, "").message).toBe("git fetch failed: exit code 2");
  });

  it("carries an invalid-usage message verbatim", () => {
    expect(GitError.invalid("branch name is required").message).toBe("branch name is required");
    expect(GitError.invalid("x").code).toBe("EINVALID");
  });
});
