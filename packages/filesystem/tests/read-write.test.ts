import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readFileBuffer, readFileString } from "../src/read.js";
import { readJson, writeFileString } from "../src/write.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-fs-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("readFileString / readFileBuffer", () => {
  it("reads UTF-8 and binary content", async () => {
    const dir = await makeTempDir();
    const textFile = join(dir, "text.txt");
    await writeFile(textFile, "héllo", "utf8");

    expect(await readFileString(textFile)).toBe("héllo");

    const binFile = join(dir, "data.bin");
    const bytes = Buffer.from([0x00, 0xff, 0x10]);
    await writeFile(binFile, bytes);

    expect(await readFileBuffer(binFile).then((b) => b.equals(bytes))).toBe(true);
  });

  it("throws FilesystemError ENOENT for missing files", async () => {
    const dir = await makeTempDir();

    await expect(readFileString(join(dir, "missing.txt"))).rejects.toMatchObject({
      name: "FilesystemError",
      code: "ENOENT",
    });
  });

  it("throws EISDIR when reading a directory", async () => {
    const dir = await makeTempDir();
    const sub = join(dir, "sub");
    await mkdir(sub);

    await expect(readFileString(sub)).rejects.toMatchObject({
      code: "EISDIR",
      path: sub,
    });
  });
});

describe("writeFileString", () => {
  it("writes content and creates nested directories by default", async () => {
    const dir = await makeTempDir();
    const target = join(dir, "a", "b", "c", "file.txt");

    await writeFileString(target, "hello");

    expect(await readFileString(target)).toBe("hello");
  });

  it("respects createDirectories: false", async () => {
    const dir = await makeTempDir();
    const target = join(dir, "new-dir", "file.txt");

    await expect(writeFileString(target, "x", { createDirectories: false })).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});

describe("readJson", () => {
  it("parses valid JSON", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "data.json");
    await writeFile(file, JSON.stringify({ name: "devix", nested: { ok: true } }));

    expect(await readJson<{ name: string }>(file)).toEqual({ name: "devix", nested: { ok: true } });
  });

  it("throws EINVALID_JSON for malformed content", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "bad.json");
    await writeFile(file, "{ not json !!");

    await expect(readJson(file)).rejects.toMatchObject({
      code: "EINVALID_JSON",
      path: file,
    });
  });

  it("throws ENOENT for missing files (not EINVALID_JSON)", async () => {
    const dir = await makeTempDir();

    await expect(readJson(join(dir, "missing.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
