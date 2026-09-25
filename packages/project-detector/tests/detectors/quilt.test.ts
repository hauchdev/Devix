import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { quiltDetector } from "../../src/detectors/quilt.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-quilt-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("quiltDetector", () => {
  it("declares the quilt markers", () => {
    expect(quiltDetector.id).toBe("quilt");
    expect(quiltDetector.name).toBe("Quilt");
    expect(quiltDetector.category).toBe("minecraft");
    expect(quiltDetector.markers).toEqual(["quilt.mod.json", "src/main/resources/quilt.mod.json"]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await quiltDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("detects quilt.mod.json with the loader id detail", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "quilt.mod.json"),
      '{\n  "schema_version": 1,\n  "quilt_loader": {\n    "id": "myquiltmod"\n  }\n}\n',
      "utf8",
    );

    const result = await quiltDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({ marker: "quilt.mod.json", detail: "myquiltmod" });
  });

  it("counts a malformed manifest as detected without detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "quilt.mod.json"), "}]not json", "utf8");

    const result = await quiltDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBeUndefined();
  });
});
