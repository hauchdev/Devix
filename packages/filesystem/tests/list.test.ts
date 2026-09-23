import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FilesystemError } from "../src/errors.js";
import { listDir, listDirSafe } from "../src/list.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-fs-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("listDir", () => {
  it("lists entries with resolved types and absolute paths", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "file.txt"), "x");
    await mkdir(join(dir, "sub"));

    const entries = await listDir(dir);

    expect(entries).toHaveLength(2);
    const byName = new Map(entries.map((entry) => [entry.name, entry]));
    expect(byName.get("file.txt")?.isFile).toBe(true);
    expect(byName.get("file.txt")?.path).toBe(join(dir, "file.txt"));
    expect(byName.get("sub")?.isDirectory).toBe(true);
  });

  it("throws ENOENT for missing directories", async () => {
    const dir = await makeTempDir();

    await expect(listDir(join(dir, "missing"))).rejects.toBeInstanceOf(FilesystemError);
    await expect(listDir(join(dir, "missing"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("throws ENOTDIR when the path is a file", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "file.txt");
    await writeFile(file, "x");

    await expect(listDir(file)).rejects.toMatchObject({ code: "ENOTDIR" });
  });
});

describe("listDirSafe", () => {
  it("returns entries for existing directories", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "a.txt"), "x");

    const entries = await listDirSafe(dir);
    expect(entries.map((entry) => entry.name)).toEqual(["a.txt"]);
  });

  it("returns an empty list for missing directories (never throws ENOENT)", async () => {
    const dir = await makeTempDir();

    expect(await listDirSafe(join(dir, "missing"))).toEqual([]);
  });

  it("still throws ENOTDIR when the path is a file", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "file.txt");
    await writeFile(file, "x");

    await expect(listDirSafe(file)).rejects.toMatchObject({ code: "ENOTDIR" });
  });
});
