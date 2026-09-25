import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { velocityDetector } from "../../src/detectors/velocity.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-velocity-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("velocityDetector", () => {
  it("declares the velocity markers", () => {
    expect(velocityDetector.id).toBe("velocity");
    expect(velocityDetector.name).toBe("Velocity");
    expect(velocityDetector.category).toBe("minecraft");
    expect(velocityDetector.markers).toEqual([
      "velocity-plugin.json",
      "src/main/resources/velocity-plugin.json",
    ]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await velocityDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("detects velocity-plugin.json with the plugin id detail", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "velocity-plugin.json"),
      '{\n  "id": "myproxy",\n  "name": "My Proxy",\n  "version": "1.0.0"\n}\n',
      "utf8",
    );

    const result = await velocityDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "velocity-plugin.json",
      detail: "myproxy",
    });
  });

  it("detects the manifest inside src/main/resources", async () => {
    const dir = await makeTempDir();
    const resources = join(dir, "src", "main", "resources");
    await mkdir(resources, { recursive: true });
    await writeFile(join(resources, "velocity-plugin.json"), '{ "id": "nested" }', "utf8");

    const result = await velocityDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "src/main/resources/velocity-plugin.json",
      detail: "nested",
    });
  });

  it("counts a malformed manifest as detected without detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "velocity-plugin.json"), "{ nope", "utf8");

    const result = await velocityDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBeUndefined();
  });
});
