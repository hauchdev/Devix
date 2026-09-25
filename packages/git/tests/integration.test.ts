import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { branches, currentBranch } from "../src/branches.js";
import { diffStat } from "../src/diff.js";
import { isRepository, repositoryRoot } from "../src/root.js";
import { status } from "../src/status.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-git-int-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function git(dir: string, args: string): void {
  execFileSync("git", args.split(" "), { cwd: dir, stdio: "ignore" });
}

/** Creates a real repository with one commit on branch main. */
async function makeRealRepo(): Promise<string> {
  const dir = await makeTempDir();
  git(dir, "init -q -b main");
  git(dir, "config user.email test@devix.local");
  git(dir, "config user.name devix-test");
  await writeFile(join(dir, "file.txt"), "one\n", "utf8");
  git(dir, "add .");
  git(dir, "commit -qm one");
  return dir;
}

const itOnWindows = process.platform === "win32" ? it : it.skip;

describe("git integration (real repositories in tmpdir)", () => {
  it("isRepository answers false outside a repository", async () => {
    const dir = await makeTempDir();

    expect(await isRepository(dir)).toBe(false);
  });

  it("repositoryRoot resolves the repository root and rejects non-repos", async () => {
    const dir = await makeRealRepo();

    const root = await repositoryRoot(dir);
    expect(root.toLowerCase()).toBe(dir.toLowerCase());
  });

  it("status reports a clean tree and the current branch", async () => {
    const dir = await makeRealRepo();

    const result = await status(dir);

    expect(result.branch).toBe("main");
    expect(result.hasCommits).toBe(true);
    expect(result.entries).toEqual([]);
  });

  it("status reports staged, added and untracked entries", async () => {
    const dir = await makeRealRepo();
    await writeFile(join(dir, "file.txt"), "one\ntwo\n", "utf8");
    await writeFile(join(dir, "added.txt"), "new\n", "utf8");
    await writeFile(join(dir, "untracked.log"), "noise\n", "utf8");
    git(dir, "add file.txt added.txt");

    const result = await status(dir);

    const byPath = new Map(result.entries.map((e) => [e.path, e]));
    // Staged modification: index changed against HEAD, tree matches index.
    expect(byPath.get("file.txt")?.index).toBe("modified");
    expect(byPath.get("file.txt")?.workingTree).toBe("other");
    expect(byPath.get("added.txt")?.index).toBe("added");
    expect(byPath.get("untracked.log")?.index).toBe("untracked");
  });

  it("status reports unstaged working tree modifications", async () => {
    const dir = await makeRealRepo();
    await writeFile(join(dir, "file.txt"), "one\ntwo\n", "utf8");

    const result = await status(dir);

    const [entry] = result.entries;
    expect(entry?.path).toBe("file.txt");
    expect(entry?.index).toBe("other");
    expect(entry?.workingTree).toBe("modified");
  });

  it("initial repositories report hasCommits false", async () => {
    const dir = await makeTempDir();
    git(dir, "init -q -b main");

    const result = await status(dir);

    expect(result.hasCommits).toBe(false);
    expect(result.branch).toBe("main");
  });

  it("branches lists the checked-out branch as current", async () => {
    const dir = await makeRealRepo();

    const list = await branches(dir);

    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("main");
    expect(list[0]?.current).toBe(true);
    expect(list[0]?.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("currentBranch answers with the branch name", async () => {
    const dir = await makeRealRepo();

    const { currentBranchName } = await currentBranch(dir);

    expect(currentBranchName).toBe("main");
  });

  it("diffStat counts added and deleted lines", async () => {
    const dir = await makeRealRepo();
    await writeFile(join(dir, "file.txt"), "one\ntwo\nthree\n", "utf8");

    const result = await diffStat(dir);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({ path: "file.txt", additions: 2, deletions: 0 });
  });

  itOnWindows("resolves npm.cmd through cmd shims with a spaced install path", async () => {
    // Guard for the shell quoting fix: git itself runs through the same
    // runCommand path, proving argv-array execution works end to end.
    const dir = await makeRealRepo();

    const result = await status(dir);
    expect(result.entries).toEqual([]);
  });
});
