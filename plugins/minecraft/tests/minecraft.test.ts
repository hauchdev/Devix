import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_MINECRAFT_VERSION,
  MINECRAFT_PLATFORMS,
  MINECRAFT_PROJECT_KINDS,
  PLATFORM_IDS,
  scaffold,
  summarizeScaffold,
} from "../src/index.js";

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
  it("lists the nine supported platforms", () => {
    expect(PLATFORM_IDS).toEqual([
      "fabric",
      "forge",
      "neoforge",
      "architectury",
      "spigot",
      "paper",
      "folia",
      "velocity",
      "bungeecord",
    ]);
    expect(MINECRAFT_PLATFORMS).toHaveLength(9);
  });

  it("exposes the three project kinds in prompt order", () => {
    expect(MINECRAFT_PROJECT_KINDS.map((kind) => kind.id)).toEqual([
      "mod",
      "plugin",
      "proxy-plugin",
    ]);
  });

  it("defaults to the newest catalog version", () => {
    expect(DEFAULT_MINECRAFT_VERSION).toBe("26.3");
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

  it("writes an architectury multi-loader skeleton with the version's second loader", async () => {
    const dir = await makeTempDir();

    // 26.3 has no Forge line: the second loader is NeoForge.
    await scaffold({
      root: dir,
      platform: "architectury",
      name: "CrossMod",
      minecraftVersion: "26.3",
    });

    expect(await readFile(join(dir, "common/build.gradle"), "utf8")).toContain("architectury");
    expect(
      await readFile(
        join(dir, "fabric/src/main/java/com/example/crossmod/fabric/CrossModFabric.java"),
        "utf8",
      ),
    ).toContain("ModInitializer");
    expect(
      await readFile(
        join(dir, "neoforge/src/main/java/com/example/crossmod/neoforge/CrossModNeoForge.java"),
        "utf8",
      ),
    ).toContain("@Mod");
  });

  it("writes an architectury legacy skeleton with Forge as the second loader", async () => {
    const dir = await makeTempDir();

    await scaffold({
      root: dir,
      platform: "architectury",
      name: "LegacyCross",
      minecraftVersion: "1.20.1",
    });

    expect(
      await readFile(
        join(dir, "forge/src/main/java/com/example/legacycross/forge/LegacyCrossForge.java"),
        "utf8",
      ),
    ).toContain("@Mod");
  });

  it("writes a multi-loader fabric+forge project with a shared catalog", async () => {
    const dir = await makeTempDir();

    const result = await scaffold({
      root: dir,
      platform: "fabric+forge",
      name: "DualLoader",
      minecraftVersion: "1.21.1",
    });

    expect(result.platforms).toEqual(["fabric", "forge"]);
    expect(await readFile(join(dir, "fabric/build.gradle"), "utf8")).toContain("fabric-loom");
    expect(await readFile(join(dir, "forge/build.gradle"), "utf8")).toContain(
      "net.minecraftforge.gradle",
    );
    const shared = await readFile(join(dir, "gradle.properties"), "utf8");
    expect(shared).toContain("minecraft_version=1.21.1");
    expect(shared).toContain("forge_version=");
    expect(shared).toContain("fabric_loader=");
  });

  it("writes a multi-module project with wired subprojects", async () => {
    const dir = await makeTempDir();

    const result = await scaffold({
      root: dir,
      platform: "fabric",
      name: "Modular",
      modules: ["api", "core"],
    });

    expect(result.modules).toEqual(["main", "api", "core"]);
    const settings = await readFile(join(dir, "settings.gradle"), "utf8");
    expect(settings).toContain("include ':api'");
    expect(settings).toContain("include ':core'");
    expect(await readFile(join(dir, "api/build.gradle"), "utf8")).toContain("java-library");
    expect(
      await readFile(
        join(dir, "core/src/main/java/com/example/modular/core/ModularCore.java"),
        "utf8",
      ),
    ).toContain("package com.example.modular.core");
    const build = await readFile(join(dir, "build.gradle"), "utf8");
    expect(build).toContain("project(':api')");
  });

  it("rejects modules that need a loader on plugin platforms", async () => {
    const dir = await makeTempDir();

    await expect(
      scaffold({ root: dir, platform: "paper", name: "X", modules: ["datagen"] }),
    ).rejects.toMatchObject({ code: "EINVALID_INPUT" });
  });

  it("rejects kind together with platform", async () => {
    const dir = await makeTempDir();

    await expect(
      scaffold({ root: dir, kind: "plugin", platform: "paper", name: "X" } as never),
    ).rejects.toMatchObject({ code: "EINVALID_INPUT" });
  });

  it("rejects multi-kind platform mixes", async () => {
    const dir = await makeTempDir();

    await expect(
      scaffold({ root: dir, platform: "fabric+paper", name: "X" }),
    ).rejects.toMatchObject({ code: "EINVALID_INPUT" });
  });

  it("resolves version aliases and rejects unknown versions", async () => {
    const dir = await makeTempDir();

    const stable = await scaffold({
      root: dir,
      platform: "paper",
      name: "V",
      minecraftVersion: "stable",
    });
    expect(stable.minecraftVersion).toBe("26.3");

    const legacy = await scaffold({
      root: dir.replace(/devix-minecraft-/, "devix-minecraft-l1-"),
      platform: "spigot",
      name: "V2",
      minecraftVersion: "1.20.1",
    });
    expect(legacy.minecraftVersion).toBe("1.20.1");
    expect(legacy.javaVersion).toBe(17);

    await expect(
      scaffold({
        root: dir.replace(/devix-minecraft-/, "devix-minecraft-l2-"),
        platform: "paper",
        name: "V3",
        minecraftVersion: "9.9.9",
      }),
    ).rejects.toMatchObject({ code: "EUNKNOWN_VERSION" });
  });

  it("rejects a platform without a dependency line for the version", async () => {
    const dir = await makeTempDir();

    await expect(
      scaffold({ root: dir, platform: "forge", name: "X", minecraftVersion: "26.3" }),
    ).rejects.toMatchObject({ code: "EUNSUPPORTED_VERSION" });
  });

  it("refuses to touch a non-empty target without overwrite", async () => {
    const dir = await makeTempDir();
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "build.gradle"), "// mine\n", "utf8");

    await expect(scaffold({ root: dir, platform: "fabric", name: "MyMod" })).rejects.toMatchObject({
      code: "EEXISTS",
    });
  });

  it("refuses a destination that already looks like a Minecraft project", async () => {
    const dir = await makeTempDir();
    const resources = join(dir, "src", "main", "resources");
    await mkdir(resources, { recursive: true });
    await writeFile(join(resources, "plugin.yml"), "name: Old\n", "utf8");

    await expect(
      scaffold({ root: dir, platform: "paper", name: "NewPlugin" }),
    ).rejects.toMatchObject({ code: "EINVALID_INPUT" });
  });

  it("describes the detected target platforms in the error message", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "fabric.mod.json"), '{ "id": "there-is-a-mod-here" }', "utf8");

    const error = await scaffold({
      root: dir,
      platform: "fabric",
      name: "X",
      minecraftVersion: "1.21.1",
    }).then(
      () => undefined,
      (error: unknown) => error as { message: string },
    );

    expect(error?.message).toContain("Fabric");
    expect(error?.message).toContain("allowExistingProject");
  });

  it("allowExistingProject permits scaffolding over an existing project without touching its files", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "fabric.mod.json"), '{ "id": "existing" }', "utf8");

    const result = await scaffold({
      root: dir,
      platform: "fabric",
      name: "SecondMod",
      allowExistingProject: true,
    });

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.targetPlatforms.map((p) => p.id)).toEqual(["fabric"]);
    // The flat pre-existing manifest is not a template path: it must survive untouched.
    await expect(readFile(join(dir, "fabric.mod.json"), "utf8")).resolves.toBe(
      '{ "id": "existing" }',
    );
  });

  it("reports an empty targetPlatforms on a fresh directory", async () => {
    const dir = await makeTempDir();

    const result = await scaffold({ root: dir, platform: "velocity", name: "Proxy" });

    expect(result.targetPlatforms).toEqual([]);
  });

  it("dry-run over an existing project writes nothing and notes the detection", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "paper-plugin.yml"), "name: Existing\n", "utf8");

    const result = await scaffold({ root: dir, platform: "paper", name: "Queue", dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.targetPlatforms.map((p) => p.id)).toEqual(["bukkit"]);
    const lines = summarizeScaffold(result);
    expect(lines.join("\n")).toContain("already a Bukkit/Spigot/Paper project (Existing)");
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
