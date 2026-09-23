import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { findUp, isAbsolutePath, resolveWithin, walkUp } from "../src/paths.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-fs-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("walkUp", () => {
  it("walks from startDir to the filesystem root, nearest first", async () => {
    const dir = await makeTempDir();
    const nested = join(dir, "a", "b");
    await mkdir(nested, { recursive: true });

    const visited: string[] = [];
    for await (const current of walkUp(nested)) {
      visited.push(current);
    }

    expect(visited[0]).toBe(nested);
    expect(visited.at(-1)).toBe(resolve(nested, sep));
    expect(visited.length).toBeGreaterThanOrEqual(3);
  });

  it("includes the root sentinel exactly once", async () => {
    const dir = await makeTempDir();

    const visited: string[] = [];
    for await (const current of walkUp(dir)) {
      visited.push(current);
    }

    expect(visited.filter((d) => d === resolve(dir, sep)).length).toBe(1);
  });
});

describe("findUp", () => {
  it("finds the nearest directory containing the entry", async () => {
    const dir = await makeTempDir();
    const nested = join(dir, "deep", "deeper");
    await mkdir(nested, { recursive: true });
    await writeFile(join(dir, "package.json"), "{}");

    expect(await findUp(nested, "package.json")).toBe(dir);
  });

  it("returns undefined when nothing matches up to the root", async () => {
    const dir = await makeTempDir();
    const nested = join(dir, "x");
    await mkdir(nested);

    expect(await findUp(nested, "definitely-not-here.anywhere")).toBeUndefined();
  });
});

describe("resolveWithin", () => {
  it("resolves plain and nested relative entries", () => {
    const base = resolve("base-dir");

    expect(resolveWithin(base, "file.txt")).toBe(join(base, "file.txt"));
    expect(resolveWithin(base, join("sub", "file.txt"))).toBe(join(base, "sub", "file.txt"));
  });

  it("allows paths that resolve to the base itself", () => {
    const base = resolve("base-dir");
    expect(resolveWithin(base, ".")).toBe(base);
  });

  it("refuses path traversal outside the base", () => {
    const base = resolve("base-dir");

    expect(() => resolveWithin(base, "../escape.txt")).toThrowError(/escapes the base directory/);
    expect(() => resolveWithin(base, join("..", "..", "escape.txt"))).toThrowError(
      /escapes the base directory/,
    );
  });
});

describe("isAbsolutePath", () => {
  it("follows platform rules", () => {
    expect(isAbsolutePath(resolve("x"))).toBe(true);
    expect(isAbsolutePath("relative/path")).toBe(false);
  });
});
