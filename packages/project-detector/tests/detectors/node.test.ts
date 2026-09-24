import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { nodeDetector } from "../../src/detectors/node.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("nodeDetector", () => {
  it("is not detected when there is no package.json", async () => {
    const dir = await makeTempDir();

    const result = await nodeDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("detects package.json with name, packageManager, engines and workspaces", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({
        name: "my-project",
        version: "1.0.0",
        packageManager: "pnpm@12.5.1",
        engines: { node: ">=22" },
        workspaces: ["packages/*"],
      }),
      "utf8",
    );

    const result = await nodeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections).toEqual([
      { marker: "package.json", path: join(dir, "package.json") },
      { marker: "package.json#name", path: join(dir, "package.json"), detail: "my-project" },
      {
        marker: "package.json#packageManager",
        path: join(dir, "package.json"),
        detail: "pnpm@12.5.1",
      },
      {
        marker: "package.json#engines",
        path: join(dir, "package.json"),
        detail: "node@>=22",
      },
      { marker: "package.json#workspaces", path: join(dir, "package.json") },
    ]);
  });

  it("detects a minimal package.json without optional fields", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "bare" }), "utf8");

    const result = await nodeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections).toHaveLength(2);
    expect(result.detections[1]).toMatchObject({ marker: "package.json#name", detail: "bare" });
  });

  it("reports the base detection even when package.json is malformed", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package.json"), "{ not json !!", "utf8");

    const result = await nodeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections).toEqual([
      { marker: "package.json", path: join(dir, "package.json") },
    ]);
  });

  it("treats a package.json directory as not detected", async () => {
    const dir = await makeTempDir();
    await mkdir(join(dir, "package.json"));

    const result = await nodeDetector.detect({ root: dir });

    expect(result.detected).toBe(false);
  });
});
