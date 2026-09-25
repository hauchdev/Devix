import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { bukkitDetector } from "../../src/detectors/bukkit.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-bukkit-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("bukkitDetector", () => {
  it("declares the bukkit markers", () => {
    expect(bukkitDetector.id).toBe("bukkit");
    expect(bukkitDetector.name).toBe("Bukkit/Spigot/Paper");
    expect(bukkitDetector.category).toBe("minecraft");
    expect(bukkitDetector.markers).toEqual([
      "plugin.yml",
      "src/main/resources/plugin.yml",
      "paper-plugin.yml",
      "src/main/resources/paper-plugin.yml",
    ]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await bukkitDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("detects plugin.yml with the plugin name detail", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "plugin.yml"),
      "name: MyPlugin\nversion: 1.0.0\nmain: com.example.MyPlugin\napi-version: 1.21\n",
      "utf8",
    );

    const result = await bukkitDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({ marker: "plugin.yml", detail: "MyPlugin" });
  });

  it("detects paper-plugin.yml in the resources layout", async () => {
    const dir = await makeTempDir();
    const resources = join(dir, "src", "main", "resources");
    await mkdir(resources, { recursive: true });
    await writeFile(join(resources, "paper-plugin.yml"), "name: PaperPlugin\n", "utf8");

    const result = await bukkitDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections.map((d) => d.marker)).toEqual(["src/main/resources/paper-plugin.yml"]);
    expect(result.detections[0]?.detail).toBe("PaperPlugin");
  });

  it("ignores inline comments when extracting the name", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "plugin.yml"), "name: MyPlugin # the plugin name\n", "utf8");

    const result = await bukkitDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBe("MyPlugin");
  });

  it("counts a malformed plugin.yml as detected without detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "plugin.yml"), "\tbroken: [yaml", "utf8");

    const result = await bukkitDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBeUndefined();
  });
});
