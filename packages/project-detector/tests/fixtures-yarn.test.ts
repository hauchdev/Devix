import { describe, expect, it } from "vitest";

import { detectProject } from "../src/detect.js";
import { yarnDetector } from "../src/detectors/yarn.js";
import { DetectorRegistry } from "../src/registry.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("fixtures", () => {
  it("yarn-project fixture is detected as a Yarn project", async () => {
    const registry = new DetectorRegistry().register(yarnDetector);

    const detection = await detectProject(registry, {
      cwd: join(fixturesDir, "yarn-project"),
    });

    expect(detection.root).toBe(join(fixturesDir, "yarn-project"));
    expect(detection.isProject).toBe(true);

    const yarn = detection.detectors.get("yarn");
    expect(yarn?.detected).toBe(true);
    const byMarker = new Map(yarn?.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("yarn.lock")).toBe("1");
  });
});
