import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { fabricDetector } from "../../src/detectors/fabric.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-fabric-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("fabricDetector", () => {
  it("declares the fabric markers", () => {
    expect(fabricDetector.id).toBe("fabric");
    expect(fabricDetector.name).toBe("Fabric");
    expect(fabricDetector.category).toBe("minecraft");
    expect(fabricDetector.markers).toEqual([
      "fabric.mod.json",
      "src/main/resources/fabric.mod.json",
    ]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await fabricDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("detects a flat fabric.mod.json with the mod id detail", async () => {
    const dir = await makeTempDir();
    const path = join(dir, "fabric.mod.json");
    await writeFile(
      path,
      '{\n  "schemaVersion": 1,\n  "id": "mymod",\n  "version": "1.0.0"\n}\n',
      "utf8",
    );

    const result = await fabricDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({ marker: "fabric.mod.json", detail: "mymod" });
  });

  it("detects the manifest inside src/main/resources (mod workspace layout)", async () => {
    const dir = await makeTempDir();
    const nested = join(dir, "src", "main", "resources");
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, "fabric.mod.json"), '{ "id": "nested" }', "utf8");

    const result = await fabricDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "src/main/resources/fabric.mod.json",
      detail: "nested",
    });
  });

  it("tolerates JSON with comments and trailing commas, extracting the id anyway", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "fabric.mod.json"),
      '{\n  // Fabric manifests are JSON5\n  "id": "commented", /* inline */\n  "version": "1.0.0",\n}',
      "utf8",
    );

    const result = await fabricDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBe("commented");
  });

  it("counts a malformed manifest as detected without detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "fabric.mod.json"), "{ not json", "utf8");

    const result = await fabricDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBeUndefined();
  });

  it("reports both markers when both layouts exist", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "fabric.mod.json"), '{ "id": "flat" }', "utf8");
    const nested = join(dir, "src", "main", "resources");
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, "fabric.mod.json"), '{ "id": "nested" }', "utf8");

    const result = await fabricDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections.map((d) => d.marker)).toEqual([
      "fabric.mod.json",
      "src/main/resources/fabric.mod.json",
    ]);
  });
});
