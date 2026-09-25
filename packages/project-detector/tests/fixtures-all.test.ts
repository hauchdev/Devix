import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { createDefaultRegistry } from "../src/defaults.js";
import { detectProject } from "../src/detect.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

/** Expected primary detector id per fixture directory name. */
const EXPECTED_DETECTOR: Record<string, string> = {
  "node-project": "node",
  "yarn-project": "yarn",
  "bun-project": "bun",
  "typescript-project": "typescript",
  "docker-project": "docker",
  "java-project": "java",
  "rust-project": "rust",
  "python-project": "python",
};

describe("fixtures (full default registry)", () => {
  it("every committed fixture is covered by an expectation", async () => {
    const fixtureNames = (await readdir(fixturesDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(fixtureNames).toEqual(Object.keys(EXPECTED_DETECTOR).sort());
  });

  for (const [fixture, expectedDetector] of Object.entries(EXPECTED_DETECTOR)) {
    it(`${fixture} is detected by the ${expectedDetector} detector`, async () => {
      const registry = createDefaultRegistry();

      const detection = await detectProject(registry, {
        cwd: join(fixturesDir, fixture),
      });

      expect(detection.root).toBe(join(fixturesDir, fixture));
      expect(detection.isProject).toBe(true);
      expect(detection.detectors.get(expectedDetector)?.detected).toBe(true);
    });
  }
});
