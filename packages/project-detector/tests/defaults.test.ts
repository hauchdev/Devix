import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { createDefaultRegistry, defaultDetectors } from "../src/defaults.js";
import { detectProject } from "../src/detect.js";

// This package lives at <repo>/packages/project-detector: the monorepo
// root two levels up has package.json, pnpm-lock.yaml and .git.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("createDefaultRegistry", () => {
  it("registers every built-in detector exactly once, in order", () => {
    const registry = createDefaultRegistry();

    expect(registry.ids()).toEqual([
      "node",
      "typescript",
      "java",
      "rust",
      "python",
      "npm",
      "pnpm",
      "yarn",
      "bun",
      "git",
      "docker",
      "fabric",
      "quilt",
      "forge",
      "neoforge",
      "bukkit",
      "bungeecord",
      "velocity",
      "sponge",
    ]);
    expect(defaultDetectors).toHaveLength(registry.ids().length);
    expect(new Set(registry.ids()).size).toBe(registry.ids().length);
  });

  it("declares at least one marker per detector", () => {
    for (const detector of createDefaultRegistry().all()) {
      expect(detector.markers.length).toBeGreaterThan(0);
      for (const marker of detector.markers) {
        expect(marker.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("aggregates a real Node.js project with every detector at once", async () => {
    const registry = createDefaultRegistry();

    const detection = await detectProject(registry, { cwd: repoRoot });

    expect(detection.isProject).toBe(true);
    expect(detection.detectors.get("node")?.detected).toBe(true);
    expect(detection.detectors.get("pnpm")?.detected).toBe(true);
    expect(detection.detectors.get("git")?.detected).toBe(true);
    expect(detection.detectors.get("typescript")?.detected).toBe(true);
    expect(detection.detectors.get("rust")?.detected).toBe(false);
    expect(detection.detectors.get("python")?.detected).toBe(false);
    expect(detection.detectors.get("fabric")?.detected).toBe(false);
    expect(detection.detectors.get("bukkit")?.detected).toBe(false);
  });
});
