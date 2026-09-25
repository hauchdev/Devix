import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { MINECRAFT_PLATFORMS, PLATFORM_IDS, scaffold, summarizeScaffold } from "../src/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-minecraft-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("minecraft platform catalog", () => {
  it("lists the eight supported platforms", () => {
    expect(PLATFORM_IDS).toEqual([
      "fabric",
      "forge",
      "architectury",
      "spigot",
      "paper",
      "folia",
      "velocity",
      "bungeecord",
    ]);
    expect(MINECRAFT_PLATFORMS).toHaveLength(8);
  });
});

describe("scaffold", () => {
  it("rejects unknown platforms with a typed error", async () => {
    const dir = await makeTempDir();

    await expect(scaffold({ root: dir, platform: "wurm", name: "X" })).rejects.toMatchObject({
      code: "EUNKNOWN_PLATFORM",
    });
  });

  it("rejects invalid names and relative roots", async () => {
    const dir = await makeTempDir();

    await expect(scaffold({ root: dir, platform: "fabric", name: "  " })).rejects.toMatchObject({
      code: "EINVALID_INPUT",
    });

    await expect(
      scaffold({ root: "relative/path", platform: "fabric", name: "X" }),
    ).rejects.toMatchObject({ code: "EINVALID_INPUT" });
  });

  it("rejects malformed package names", async () => {
    const dir = await makeTempDir();

    await expect(
      scaffold({ root: dir, platform: "fabric", name: "X", packageName: "not a package" }),
    ).rejects.toMatchObject({ code: "EINVALID_INPUT" });
  });

  it("dry-run writes nothing", async () => {
    const dir = await makeTempDir();

    const result = await scaffold({ root: dir, platform: "fabric", name: "MyMod", dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(await readdir(dir)).toEqual([]);
  });

  it("writes a complete fabric skeleton with real contents", async () => {
    const dir = await makeTempDir();

    const result = await scaffold({
      root: dir,
      platform: "fabric",
      name: "MyMod",
      packageName: "com.example.mymod",
    });

    expect(result.dryRun).toBe(false);
    expect(result.files.every((f) => f.skipped === false)).toBe(true);

    const manifest = JSON.parse(
      await readFile(join(dir, "src/main/resources/fabric.mod.json"), "utf8"),
    ) as { id: string; entrypoints: { main: string[] } };
    expect(manifest.id).toBe("mymod");
    expect(manifest.entrypoints.main[0]).toBe("com.example.mymod.MyMod");

    const java = await readFile(join(dir, "src/main/java/com/example/mymod/MyMod.java"), "utf8");
    expect(java).toContain("package com.example.mymod;");
    expect(java).toContain("implements ModInitializer");

    const gradle = await readFile(join(dir, "build.gradle"), "utf8");
    expect(gradle).toContain("fabric-loom");
  });

  it("writes a spigot maven skeleton with plugin.yml", async () => {
    const dir = await makeTempDir();

    const result = await scaffold({
      root: dir,
      platform: "spigot",
      name: "EggCannon",
      packageName: "com.example.eggcannon",
    });

    const yml = await readFile(join(dir, "src/main/resources/plugin.yml"), "utf8");
    expect(yml).toContain("name: EggCannon");
    expect(yml).toContain("main: com.example.eggcannon.EggCannon");

    const pom = await readFile(join(dir, "pom.xml"), "utf8");
    expect(pom).toContain("spigot-api");
    expect(result.files.length).toBeGreaterThanOrEqual(3);
  });

  it("writes an architectury multi-loader skeleton", async () => {
    const dir = await makeTempDir();

    await scaffold({ root: dir, platform: "architectury", name: "CrossMod" });

    expect(await readFile(join(dir, "common/build.gradle"), "utf8")).toContain("architectury");
    expect(
      await readFile(
        join(dir, "fabric/src/main/java/com/example/crossmod/fabric/CrossModFabric.java"),
        "utf8",
      ),
    ).toContain("ModInitializer");
    expect(
      await readFile(
        join(dir, "forge/src/main/java/com/example/crossmod/forge/CrossModForge.java"),
        "utf8",
      ),
    ).toContain("@Mod");
  });

  it("refuses to touch a non-empty target without overwrite", async () => {
    const dir = await makeTempDir();
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "build.gradle"), "// mine\n", "utf8");

    await expect(scaffold({ root: dir, platform: "fabric", name: "MyMod" })).rejects.toMatchObject({
      code: "EEXISTS",
    });
  });

  it("skips existing files when overwrite is enabled, never rewriting them", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "build.gradle"), "// my custom build\n", "utf8");

    const result = await scaffold({
      root: dir,
      platform: "fabric",
      name: "MyMod",
      overwrite: true,
    });

    const buildEntry = result.files.find((f) => f.path.endsWith("build.gradle"));
    expect(buildEntry?.skipped).toBe(true);
    expect(await readFile(join(dir, "build.gradle"), "utf8")).toBe("// my custom build\n");
  });

  it("summarizes results for humans", async () => {
    const dir = await makeTempDir();

    const result = await scaffold({ root: dir, platform: "paper", name: "Queue" });

    const lines = summarizeScaffold(result);
    expect(lines[0]).toContain("Wrote");
    expect(lines.join("\n")).toContain("paper-plugin.yml");
  });
});
