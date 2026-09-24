import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { findProjectRoot } from "../src/root.js";
import { nodeDetector } from "../src/detectors/node.js";
import type { DetectionResult, Detector } from "../src/types.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-root-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function markerDetector(markers: readonly string[]): Detector {
  return {
    id: "markers",
    name: "markers",
    markers,
    async detect(): Promise<DetectionResult> {
      return { detected: false, detections: [] };
    },
  };
}

describe("findProjectRoot", () => {
  it("returns the starting directory when no marker exists", async () => {
    const dir = await makeTempDir();

    const root = await findProjectRoot(dir, [markerDetector(["missing.marker"])]);

    expect(root).toBe(dir);
  });

  it("finds the nearest directory containing a marker", async () => {
    const root = await makeTempDir();
    const nested = join(root, "a", "b");
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, "package.json"), "{}", "utf8");

    const found = await findProjectRoot(join(nested, "c"), [nodeDetector]);

    expect(found).toBe(nested);
  });

  it("prefers the closest marker when several levels have markers", async () => {
    const root = await makeTempDir();
    const nested = join(root, "child");
    await mkdir(nested, { recursive: true });
    await writeFile(join(root, "package.json"), "{}", "utf8");
    await writeFile(join(nested, "other.marker"), "", "utf8");

    const found = await findProjectRoot(nested, [nodeDetector, markerDetector(["other.marker"])]);

    expect(found).toBe(nested);
  });

  it("supports directory markers", async () => {
    const root = await makeTempDir();
    const markerDir = join(root, ".git");
    await mkdir(markerDir, { recursive: true });

    const found = await findProjectRoot(root, [markerDetector([".git"])]);

    expect(found).toBe(root);
  });
});
