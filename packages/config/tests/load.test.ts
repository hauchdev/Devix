import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig, readConfigFile } from "../src/load.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-config-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function writeJson(dir: string, fileName: string, content: string): Promise<string> {
  const filePath = join(dir, fileName);
  await writeFile(filePath, content, "utf8");
  return filePath;
}

describe("loadConfig", () => {
  it("returns undefined when no config file exists", async () => {
    const dir = await makeTempDir();

    expect(await loadConfig({ cwd: dir })).toBeUndefined();
  });

  it("finds devix.config.json in the starting directory", async () => {
    const dir = await makeTempDir();
    await writeJson(dir, "devix.config.json", JSON.stringify({ name: "devix" }));

    const config = await loadConfig({ cwd: dir });

    expect(config).toEqual({ name: "devix" });
  });

  it("prefers devix.config.json over devix.json in the same directory", async () => {
    const dir = await makeTempDir();
    await writeJson(dir, "devix.config.json", JSON.stringify({ name: "canonical" }));
    await writeJson(dir, "devix.json", JSON.stringify({ name: "fallback" }));

    const config = await loadConfig({ cwd: dir });

    expect(config).toEqual({ name: "canonical" });
  });

  it("walks up to the nearest config file", async () => {
    const root = await makeTempDir();
    const nested = join(root, "a", "b");
    await mkdir(nested, { recursive: true });
    await writeJson(root, "devix.config.json", JSON.stringify({ name: "root" }));
    await writeJson(nested, "devix.json", JSON.stringify({ name: "nested" }));

    const config = await loadConfig({ cwd: nested });

    expect(config).toEqual({ name: "nested" });
  });

  it("treats an empty file as an empty config", async () => {
    const dir = await makeTempDir();
    await writeJson(dir, "devix.config.json", "");

    expect(await loadConfig({ cwd: dir })).toEqual({});
  });
});

describe("readConfigFile", () => {
  it("reads and normalizes a full config", async () => {
    const dir = await makeTempDir();
    const filePath = await writeJson(
      dir,
      "devix.config.json",
      JSON.stringify({
        name: "my-project",
        features: { doctor: true, git: false, deps: true },
      }),
    );

    expect(await readConfigFile(filePath)).toEqual({
      name: "my-project",
      features: { doctor: true, git: false, deps: true },
    });
  });

  it("accepts devix.json as a file name", async () => {
    const dir = await makeTempDir();
    const filePath = await writeJson(dir, "devix.json", JSON.stringify({ name: "x" }));

    expect(await readConfigFile(filePath)).toEqual({ name: "x" });
  });

  it("throws EPARSE for malformed JSON", async () => {
    const dir = await makeTempDir();
    const filePath = await writeJson(dir, "devix.config.json", "{ not json !!");

    await expect(readConfigFile(filePath)).rejects.toMatchObject({
      name: "ConfigError",
      code: "EPARSE",
      path: filePath,
    });
  });

  it("throws EINVALID_CONFIG for unknown keys and wrong types", async () => {
    const dir = await makeTempDir();
    const filePath = await writeJson(
      dir,
      "devix.config.json",
      JSON.stringify({ name: 42, unknownKey: true, features: { doctor: "yes" } }),
    );

    const error = await readConfigFile(filePath).catch((e: unknown) => e);

    expect(error).toMatchObject({
      name: "ConfigError",
      code: "EINVALID_CONFIG",
      path: filePath,
    });
    const problems = (error as { message: string }).message;
    expect(problems).toContain('"name" must be a string');
    expect(problems).toContain('unknown key "unknownKey"');
    expect(problems).toContain('feature "doctor" must be a boolean');
  });

  it("throws EINVALID_CONFIG for arrays and strings instead of objects", async () => {
    const dir = await makeTempDir();
    const arrayPath = await writeJson(dir, "devix.config.json", "[1, 2, 3]");
    const stringPath = await writeJson(dir, "devix.json", '"hello"');

    await expect(readConfigFile(arrayPath)).rejects.toMatchObject({ code: "EINVALID_CONFIG" });
    await expect(readConfigFile(stringPath)).rejects.toMatchObject({ code: "EINVALID_CONFIG" });
  });

  it("throws EUNSUPPORTED_FORMAT for unrecognized config file names", async () => {
    const dir = await makeTempDir();
    const filePath = await writeJson(dir, "config.json", JSON.stringify({ name: "x" }));

    await expect(readConfigFile(filePath)).rejects.toMatchObject({
      code: "EUNSUPPORTED_FORMAT",
      path: filePath,
    });
  });

  it("throws EIO when the file cannot be read", async () => {
    const dir = await makeTempDir();
    const filePath = join(dir, "devix.config.json");

    // File name is valid but it does not exist: reading fails.
    await expect(readConfigFile(filePath)).rejects.toMatchObject({
      code: "EIO",
      path: filePath,
    });
  });

  it("rejects config files passed as directories", async () => {
    const dir = await makeTempDir();
    const sub = join(dir, "devix.config.json");
    await mkdir(sub);

    await expect(readConfigFile(sub)).rejects.toMatchObject({ code: "EIO" });
  });
});
