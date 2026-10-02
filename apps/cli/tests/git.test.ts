import { describe, expect, it } from "vitest";

import { runCli } from "./helpers/subprocess.js";

describe("devix git", () => {
  it("git status shows the branch of this repository", async () => {
    const { stdout } = await runCli(["git", "status", "--no-color"]);

    expect(stdout).toMatch(/^\s+Branch\s+\S+/m);
  }, 30_000);

  it("git branches marks the current branch", async () => {
    const { stdout } = await runCli(["git", "branches", "--no-color"], undefined, undefined, {
      DEVIX_UNICODE: "1",
    });

    // The current branch is marked; every other row leaves the column
    // blank.
    expect(stdout).toMatch(/^✓\s+main\s+[0-9a-f]{9}/m);
  }, 30_000);

  it("git outside a repository fails with a clear message", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-git-empty-"));
    try {
      await expect(runCli(["git", "status"], empty)).rejects.toThrow(/not a git repository/i);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  }, 30_000);
});
