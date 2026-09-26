import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDefaultRegistry } from "../src/defaults.js";
import { detectMinecraftPlatforms } from "../src/minecraft.js";
import { DetectorRegistry } from "../src/registry.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-minecraft-detect-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("detectMinecraftPlatforms", () => {
  it("reports no platforms in an empty directory without error", async () => {
    const dir = await makeTempDir();

    const detection = await detectMinecraftPlatforms(createDefaultRegistry(), { cwd: dir });

    expect(detection.isMinecraft).toBe(false);
    expect(detection.platforms).toEqual([]);
    expect(detection.root).toBe(dir);
  });

  it("does not classify non-minecraft detectors as platforms", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package.json"), "{}", "utf8");

    const detection = await detectMinecraftPlatforms(createDefaultRegistry(), { cwd: dir });

    expect(detection.isMinecraft).toBe(false);
    expect(detection.platforms).toEqual([]);
  });

  it("detects a fabric mod with its mod id detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "fabric.mod.json"), '{ "schemaVersion": 1, "id": "mymod" }', "utf8");

    const detection = await detectMinecraftPlatforms(createDefaultRegistry(), { cwd: dir });

    expect(detection.isMinecraft).toBe(true);
    expect(detection.platforms).toHaveLength(1);
    expect(detection.platforms[0]).toMatchObject({ id: "fabric", name: "Fabric", detail: "mymod" });
    expect(detection.platforms[0]?.markers[0]).toMatchObject({
      marker: "fabric.mod.json",
      detail: "mymod",
    });
  });

  it("detects a paper plugin via the bukkit detector in the resources layout", async () => {
    const dir = await makeTempDir();
    const resources = join(dir, "src", "main", "resources");
    await mkdir(resources, { recursive: true });
    await writeFile(join(resources, "paper-plugin.yml"), "name: QueueBoard\n", "utf8");

    const detection = await detectMinecraftPlatforms(createDefaultRegistry(), { cwd: dir });

    expect(detection.platforms.map((p) => p.id)).toEqual(["bukkit"]);
    expect(detection.platforms[0]?.detail).toBe("QueueBoard");
  });

  it("resolves the root upwards when invoked from a nested directory", async () => {
    const dir = await makeTempDir();
    const nested = join(dir, "src", "main", "java");
    await mkdir(nested, { recursive: true });
    await writeFile(join(dir, "fabric.mod.json"), '{ "id": "rooted" }', "utf8");

    const detection = await detectMinecraftPlatforms(createDefaultRegistry(), { cwd: nested });

    expect(detection.root).toBe(dir);
    expect(detection.platforms.map((p) => p.id)).toEqual(["fabric"]);
  });

  it("keeps registration order and one entry per detector across multiple platforms", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "fabric.mod.json"), '{ "id": "dual" }', "utf8");
    await writeFile(join(dir, "velocity-plugin.json"), '{ "id": "proxy" }', "utf8");

    const detection = await detectMinecraftPlatforms(createDefaultRegistry(), { cwd: dir });

    expect(detection.platforms.map((p) => p.id)).toEqual(["fabric", "velocity"]);
  });

  it("treats a malformed manifest as detected without detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "fabric.mod.json"), "{ not json", "utf8");

    const detection = await detectMinecraftPlatforms(createDefaultRegistry(), { cwd: dir });

    expect(detection.platforms).toHaveLength(1);
    expect(detection.platforms[0]?.id).toBe("fabric");
    expect(detection.platforms[0]?.detail).toBeUndefined();
  });

  it("ignores forged minecraft-category ids in custom registries", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "fabric.mod.json"), '{ "id": "real" }', "utf8");

    const registry = createDefaultRegistry();
    registry.register({
      id: "impostor",
      name: "Impostor",
      category: "minecraft",
      markers: ["some-marker.txt"],
      async detect() {
        return {
          detected: true,
          detections: [{ marker: "some-marker.txt", path: join(dir, "some-marker.txt") }],
        };
      },
    });

    const detection = await detectMinecraftPlatforms(new DetectorRegistry().registerAll([]), {
      cwd: dir,
    });
    expect(detection.isMinecraft).toBe(false);

    const withImpostor = await detectMinecraftPlatforms(registry, { cwd: dir });
    expect(withImpostor.platforms.map((p) => p.id)).toEqual(["fabric", "impostor"]);
  });
});
