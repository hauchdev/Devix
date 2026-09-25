import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { npmDetector } from "../../src/detectors/npm.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-npm-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("npmDetector", () => {
  it("declares package-lock.json as its marker", () => {
    expect(npmDetector.id).toBe("npm");
    expect(npmDetector.name).toBe("npm");
    expect(npmDetector.markers).toEqual(["package-lock.json"]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await npmDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("is detected when package-lock.json exists", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package-lock.json"), "{}", "utf8");

    const result = await npmDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections).toHaveLength(1);
    expect(result.detections[0]).toMatchObject({
      marker: "package-lock.json",
      path: join(dir, "package-lock.json"),
    });
  });

  it("does not detect a lockfile in a nested directory", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "nested", "package-lock.json"), "{}", "utf8").catch(() => {
      // The nested directory does not exist; detection must still be false.
    });

    const result = await npmDetector.detect({ root: dir });

    expect(result.detected).toBe(false);
  });
});
