import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { gitDetector } from "../../src/detectors/git.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-git-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("gitDetector", () => {
  it("declares .git as its marker", () => {
    expect(gitDetector.id).toBe("git");
    expect(gitDetector.name).toBe("Git");
    expect(gitDetector.markers).toEqual([".git"]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await gitDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("is detected when .git is a directory, with detail 'directory'", async () => {
    const dir = await makeTempDir();
    await mkdir(join(dir, ".git"));

    const result = await gitDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: ".git",
      path: join(dir, ".git"),
      detail: "directory",
    });
  });

  it("is detected when .git is a file, with detail 'file'", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, ".git"), "gitdir: ../.git/modules/app\n", "utf8");

    const result = await gitDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: ".git",
      path: join(dir, ".git"),
      detail: "file",
    });
  });
});
