import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDefaultRegistry } from "../src/defaults.js";
import { summarizeProject } from "../src/summary.js";
import { DetectorRegistry } from "../src/registry.js";
import type { DetectionResult, Detector } from "../src/types.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-summary-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function customCategoryDetector(id: string): Detector {
  return {
    id,
    name: id,
    category: "custom",
    markers: [`${id}.marker`],
    async detect(context): Promise<DetectionResult> {
      const { isFile } = await import("@devix-cli/filesystem");
      const path = join(context.root, `${id}.marker`);
      if (await isFile(path)) {
        return { detected: true, detections: [{ marker: `${id}.marker`, path }] };
      }
      return { detected: false, detections: [] };
    },
  };
}

describe("summarizeProject", () => {
  // The no-marker worst case walks every ancestor probing all markers;
  // on Windows runners this is measurably slower than on Linux, so the
  // CI timeout is raised well above the usual default.
  it(
    "returns empty groups and isProject false on an empty directory",
    { timeout: 30_000 },
    async () => {
      const dir = await makeTempDir();

      const summary = await summarizeProject(createDefaultRegistry(), { cwd: dir });

      expect(summary).toEqual({
        root: dir,
        isProject: false,
        languages: [],
        packageManagers: [],
        tools: [],
      });
    },
  );

  it("groups a node+pnpm project into languages and packageManagers", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "x", packageManager: "pnpm@12.5.1" }),
      "utf8",
    );
    await writeFile(join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

    const summary = await summarizeProject(createDefaultRegistry(), { cwd: dir });

    expect(summary.isProject).toBe(true);
    expect(summary.languages.map((e) => e.id)).toEqual(["node"]);
    expect(summary.packageManagers.map((e) => e.id)).toEqual(["pnpm"]);
    expect(summary.packageManagers[0]?.detection).toMatchObject({
      marker: "pnpm-lock.yaml",
      detail: "9.0",
    });
  });

  it("groups git and docker under tools", async () => {
    const dir = await makeTempDir();
    await mkdir(join(dir, ".git"));
    await writeFile(join(dir, "Dockerfile"), "FROM node:22-alpine\n", "utf8");

    const summary = await summarizeProject(createDefaultRegistry(), { cwd: dir });

    expect(summary.tools.map((e) => e.id)).toEqual(["git", "docker"]);
  });

  it("keeps registration order within each category", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "Cargo.toml"), '[package]\nname = "x"\n', "utf8");
    await writeFile(join(dir, "pyproject.toml"), '[project]\nname = "y"\n', "utf8");
    await writeFile(join(dir, "package.json"), "{}", "utf8");
    await writeFile(join(dir, "yarn.lock"), "# yarn lockfile v1\n", "utf8");

    const summary = await summarizeProject(createDefaultRegistry(), { cwd: dir });

    expect(summary.languages.map((e) => e.id)).toEqual(["node", "rust", "python"]);
    expect(summary.packageManagers.map((e) => e.id)).toEqual(["yarn"]);
  });

  it("groups unknown categories as tools", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "mytool.marker"), "", "utf8");
    const registry = new DetectorRegistry().register(customCategoryDetector("mytool"));

    const summary = await summarizeProject(registry, { cwd: dir });

    expect(summary.languages).toEqual([]);
    expect(summary.packageManagers).toEqual([]);
    expect(summary.tools.map((e) => e.id)).toEqual(["mytool"]);
    expect(summary.tools[0]?.category).toBe("custom");
  });

  it("omits entries for detectors that did not detect anything", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package.json"), "{}", "utf8");

    const summary = await summarizeProject(createDefaultRegistry(), { cwd: dir });

    expect(summary.languages.map((e) => e.id)).toEqual(["node"]);
    expect(summary.packageManagers).toEqual([]);
  });
});
