import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { pnpmDetector } from "../../src/detectors/pnpm.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-pnpm-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("pnpmDetector", () => {
  it("declares pnpm markers", () => {
    expect(pnpmDetector.id).toBe("pnpm");
    expect(pnpmDetector.name).toBe("pnpm");
    expect(pnpmDetector.markers).toEqual(["pnpm-lock.yaml", "pnpm-workspace.yaml"]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await pnpmDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("is detected when pnpm-lock.yaml exists, with lockfileVersion detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

    const result = await pnpmDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "pnpm-lock.yaml",
      path: join(dir, "pnpm-lock.yaml"),
      detail: "9.0",
    });
  });

  it("reports the lockfile marker without detail when the version is absent", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pnpm-lock.yaml"), "importers:\n  .:\n", "utf8");

    const result = await pnpmDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "pnpm-lock.yaml",
    });
    expect(result.detections[0]?.detail).toBeUndefined();
  });

  it("counts a malformed lockfile as detected (no detail)", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pnpm-lock.yaml"), "\x00\x01 not yaml at all", "utf8");

    const result = await pnpmDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("pnpm-lock.yaml");
    expect(result.detections[0]?.detail).toBeUndefined();
  });

  it("is detected when only pnpm-workspace.yaml exists", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");

    const result = await pnpmDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections.map((d) => d.marker)).toEqual(["pnpm-workspace.yaml"]);
  });

  it("reports both markers when both files exist", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    await writeFile(join(dir, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");

    const result = await pnpmDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections.map((d) => d.marker)).toEqual([
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
    ]);
  });

  it("finds the root upward via the declared markers", async () => {
    const root = await makeTempDir();
    const nested = join(root, "packages", "app");
    await mkdir(nested, { recursive: true });
    await writeFile(join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");

    const result = await pnpmDetector.detect({ root });

    expect(result.detected).toBe(true);
  });
});
