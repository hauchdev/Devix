import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { spongeDetector } from "../../src/detectors/sponge.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-sponge-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("spongeDetector", () => {
  it("declares the sponge markers", () => {
    expect(spongeDetector.id).toBe("sponge");
    expect(spongeDetector.name).toBe("Sponge");
    expect(spongeDetector.category).toBe("minecraft");
    expect(spongeDetector.markers).toEqual([
      "sponge_plugin.json",
      "src/main/resources/sponge_plugin.json",
      "src/main/resources/mcmod.info",
      "mcmod.info",
    ]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await spongeDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("detects sponge_plugin.json with the plugin id detail", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "sponge_plugin.json"),
      '{\n  "plugin": { "id": "myspongeplugin" },\n  "version": "1.0.0"\n}\n',
      "utf8",
    );

    const result = await spongeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "sponge_plugin.json",
      detail: "myspongeplugin",
    });
  });

  it("detects the legacy mcmod.info (Sponge 7 and earlier)", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "mcmod.info"),
      '[{\n  "modid": "legacymod",\n  "name": "Legacy Mod"\n}]\n',
      "utf8",
    );

    const result = await spongeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("mcmod.info");
  });

  it("counts a malformed manifest as detected without detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "sponge_plugin.json"), "{ broken", "utf8");

    const result = await spongeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBeUndefined();
  });
});
