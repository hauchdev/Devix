import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { bungeecordDetector } from "../../src/detectors/bungeecord.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-bungee-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("bungeecordDetector", () => {
  it("declares the bungeecord markers", () => {
    expect(bungeecordDetector.id).toBe("bungeecord");
    expect(bungeecordDetector.name).toBe("BungeeCord");
    expect(bungeecordDetector.category).toBe("minecraft");
    expect(bungeecordDetector.markers).toEqual([
      "bungee.yml",
      "src/main/resources/bungee.yml",
      "plugin.yml",
      "src/main/resources/plugin.yml",
    ]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await bungeecordDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("detects bungee.yml with the plugin name detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "bungee.yml"), "name: MyProxy\nmain: com.example.MyProxy\n", "utf8");

    const result = await bungeecordDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({ marker: "bungee.yml", detail: "MyProxy" });
  });

  it("falls back to plugin.yml (legacy Bukkit manifest for BungeeCord)", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "plugin.yml"), "name: LegacyProxy\n", "utf8");

    const result = await bungeecordDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections.map((d) => d.marker)).toEqual(["plugin.yml"]);
    expect(result.detections[0]?.detail).toBe("LegacyProxy");
  });

  it("prefers bungee.yml and reports both when both exist", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "bungee.yml"), "name: Modern\n", "utf8");
    await writeFile(join(dir, "plugin.yml"), "name: Legacy\n", "utf8");

    const result = await bungeecordDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections.map((d) => d.marker)).toEqual(["bungee.yml", "plugin.yml"]);
  });

  it("counts a malformed bungee.yml as detected without detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "bungee.yml"), "]]] nope", "utf8");

    const result = await bungeecordDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBeUndefined();
  });
});
