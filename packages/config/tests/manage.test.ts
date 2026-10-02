import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  findConfigPath,
  getConfigValue,
  listConfig,
  setConfigValue,
  writeConfig,
  type DevixConfig,
} from "../src/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-config-manage-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("getConfigValue", () => {
  it("reads top-level and nested keys", () => {
    const config: DevixConfig = { name: "demo", features: { doctor: true } };

    expect(getConfigValue(config, "name")).toBe("demo");
    expect(getConfigValue(config, "features.doctor")).toBe(true);
  });

  it("returns undefined for unknown paths", () => {
    const config: DevixConfig = { name: "demo" };

    expect(getConfigValue(config, "features.git")).toBeUndefined();
    expect(getConfigValue(config, "missing.deep.key")).toBeUndefined();
    expect(getConfigValue(config, "")).toBeUndefined();
  });
});

describe("setConfigValue", () => {
  it("sets a top-level key without mutating the input", () => {
    const config: DevixConfig = { name: "demo" };

    const next = setConfigValue(config, "name", "renamed");

    expect(next.name).toBe("renamed");
    expect(config.name).toBe("demo");
  });

  it("creates nested objects as needed", () => {
    const next = setConfigValue({}, "features.git", false);

    expect(next.features).toEqual({ git: false });
  });

  it("merges into existing nested objects", () => {
    const config: DevixConfig = { features: { doctor: true } };

    const next = setConfigValue(config, "features.deps", true);

    expect(next.features).toEqual({ doctor: true, deps: true });
  });

  it("rejects unknown keys", () => {
    expect(() => setConfigValue({}, "unknown", true)).toThrowError(/unknown key/i);
    expect(() => setConfigValue({}, "features.unknown", true)).toThrowError(/unknown feature/i);
  });

  it("rejects wrong value types", () => {
    expect(() => setConfigValue({}, "features.git", "yes")).toThrowError(/must be a boolean/i);
    expect(() => setConfigValue({}, "name", 42)).toThrowError(/must be a string/i);
  });

  it("rejects an empty key", () => {
    expect(() => setConfigValue({}, "", true)).toThrowError(/cannot be empty/i);
  });
});

describe("listConfig", () => {
  it("flattens nested keys into dotted paths", () => {
    const config: DevixConfig = { name: "demo", features: { doctor: true, git: false } };

    expect(listConfig(config)).toEqual({
      name: "demo",
      "features.doctor": true,
      "features.git": false,
    });
  });

  it("returns an empty object for an empty config", () => {
    expect(listConfig({})).toEqual({});
  });
});

describe("findConfigPath", () => {
  it("returns the default path when no config exists", async () => {
    const dir = await makeTempDir();

    const path = await findConfigPath({ cwd: dir });

    expect(path).toBe(join(dir, "devix.config.json"));
  });

  it("finds an existing config in the same directory", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "devix.json"), "{}", "utf8");

    const path = await findConfigPath({ cwd: dir });

    expect(path).toBe(join(dir, "devix.json"));
  });

  it("finds a config in a parent directory", async () => {
    const dir = await makeTempDir();
    const child = join(dir, "packages", "app");
    await writeFile(join(dir, "devix.config.json"), "{}", "utf8").then(async () => {
      const { mkdir } = await import("node:fs/promises");
      await mkdir(child, { recursive: true });
    });

    const path = await findConfigPath({ cwd: child });

    expect(path).toBe(join(dir, "devix.config.json"));
  });
});

describe("writeConfig", () => {
  it("writes formatted JSON", async () => {
    const dir = await makeTempDir();
    const path = join(dir, "devix.config.json");

    await writeConfig(path, { name: "demo", features: { doctor: true } });

    const content = await readFile(path, "utf8");
    expect(content).toContain('"name": "demo"');
    expect(content.endsWith("\n")).toBe(true);
    expect(JSON.parse(content)).toEqual({ name: "demo", features: { doctor: true } });
  });

  it("rejects unrecognized file names", async () => {
    const dir = await makeTempDir();

    await expect(writeConfig(join(dir, "other.json"), {})).rejects.toMatchObject({
      code: "EUNSUPPORTED_FORMAT",
    });
  });

  it("rejects invalid config shapes", async () => {
    const dir = await makeTempDir();

    await expect(
      writeConfig(join(dir, "devix.config.json"), { unknown: true } as never),
    ).rejects.toMatchObject({ code: "EINVALID_CONFIG" });
  });
});
