import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { detectProject } from "../src/detect.js";
import { nodeDetector } from "../src/detectors/node.js";
import { DetectorRegistry } from "../src/registry.js";
import type { DetectContext, DetectionResult, Detector } from "../src/types.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-detect-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function gitDetector(): Detector {
  return {
    id: "git",
    name: "Git",
    markers: [".git"],
    async detect(context: DetectContext): Promise<DetectionResult> {
      const { isDirectory } = await import("@devix/filesystem");
      const path = join(context.root, ".git");
      const detected = await isDirectory(path);
      return detected
        ? { detected: true, detections: [{ marker: ".git", path }] }
        : { detected: false, detections: [] };
    },
  };
}

describe("detectProject", () => {
  it("reports isProject: false on an empty directory", async () => {
    const dir = await makeTempDir();
    const registry = new DetectorRegistry().register(nodeDetector);

    const detection = await detectProject(registry, { cwd: dir });

    expect(detection).toEqual({
      root: dir,
      isProject: false,
      detectors: new Map([["node", { detected: false, detections: [] }]]),
    });
  });

  it("aggregates results from multiple detectors in registration order", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "x" }), "utf8");
    await mkdir(join(dir, ".git"));
    const registry = new DetectorRegistry().registerAll([nodeDetector, gitDetector()]);

    const detection = await detectProject(registry, { cwd: dir });

    expect(detection.isProject).toBe(true);
    expect(detection.detectors.get("node")?.detected).toBe(true);
    expect(detection.detectors.get("git")?.detected).toBe(true);
    expect([...detection.detectors.keys()]).toEqual(["node", "git"]);
  });

  it("resolves the root upward before running detectors", async () => {
    const root = await makeTempDir();
    const nested = join(root, "deep", "deeper");
    await mkdir(nested, { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "monorepo" }), "utf8");
    const registry = new DetectorRegistry().register(nodeDetector);

    const detection = await detectProject(registry, { cwd: nested });

    expect(detection.root).toBe(root);
    expect(detection.isProject).toBe(true);
    expect(detection.detectors.get("node")?.detections[0]).toMatchObject({
      marker: "package.json",
      path: join(root, "package.json"),
    });
  });

  it("allows running a subset of detectors via options", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package.json"), "{}", "utf8");
    await mkdir(join(dir, ".git"));
    const registry = new DetectorRegistry().registerAll([nodeDetector, gitDetector()]);

    const detection = await detectProject(registry, { cwd: dir, detectors: [gitDetector()] });

    expect([...detection.detectors.keys()]).toEqual(["git"]);
  });
});
