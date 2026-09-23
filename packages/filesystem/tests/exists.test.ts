import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { exists, isDirectory, isFile } from "../src/exists.js";

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

describe("exists / isFile / isDirectory", () => {
  it("detects existing files and directories", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "file.txt");
    await writeFile(file, "x");
    const sub = join(dir, "sub");
    await mkdir(sub);

    expect(await exists(file)).toBe(true);
    expect(await isFile(file)).toBe(true);
    expect(await isDirectory(file)).toBe(false);

    expect(await exists(sub)).toBe(true);
    expect(await isDirectory(sub)).toBe(true);
    expect(await isFile(sub)).toBe(false);
  });

  it("returns false (never throws) for missing paths", async () => {
    const dir = await makeTempDir();
    const missing = join(dir, "does-not-exist");

    expect(await exists(missing)).toBe(false);
    expect(await isFile(missing)).toBe(false);
    expect(await isDirectory(missing)).toBe(false);
  });
});
