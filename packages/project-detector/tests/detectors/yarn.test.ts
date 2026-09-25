import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { yarnDetector } from "../../src/detectors/yarn.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-yarn-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("yarnDetector", () => {
  it("declares yarn markers", () => {
    expect(yarnDetector.id).toBe("yarn");
    expect(yarnDetector.name).toBe("Yarn");
    expect(yarnDetector.markers).toEqual(["yarn.lock", ".yarnrc.yml"]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await yarnDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("is detected when yarn.lock exists, with lockfile version detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "yarn.lock"), "# yarn lockfile v1\n", "utf8");

    const result = await yarnDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "yarn.lock",
      path: join(dir, "yarn.lock"),
      detail: "1",
    });
  });

  it("is detected with a Berry-style yarn.lock without header detail", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "yarn.lock"),
      "__metadata:\n  version: 8\n  cacheKey: 10c0\n",
      "utf8",
    );

    const result = await yarnDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("yarn.lock");
    expect(result.detections[0]?.detail).toBeUndefined();
  });

  it("counts a malformed lockfile as detected (no detail)", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "yarn.lock"), "\x00\x01 not a lockfile", "utf8");

    const result = await yarnDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("yarn.lock");
    expect(result.detections[0]?.detail).toBeUndefined();
  });

  it("is detected when only .yarnrc.yml exists", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, ".yarnrc.yml"), "enableGlobalCache: true\n", "utf8");

    const result = await yarnDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections.map((d) => d.marker)).toEqual([".yarnrc.yml"]);
  });

  it("reports both markers when both files exist", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "yarn.lock"), "# yarn lockfile v1\n", "utf8");
    await writeFile(join(dir, ".yarnrc.yml"), "enableGlobalCache: true\n", "utf8");

    const result = await yarnDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections.map((d) => d.marker)).toEqual(["yarn.lock", ".yarnrc.yml"]);
  });

  it("finds the root upward via the declared markers", async () => {
    const root = await makeTempDir();
    const nested = join(root, "packages", "app");
    await mkdir(nested, { recursive: true });
    await writeFile(join(root, "yarn.lock"), "# yarn lockfile v1\n", "utf8");

    const result = await yarnDetector.detect({ root });

    expect(result.detected).toBe(true);
  });
});
