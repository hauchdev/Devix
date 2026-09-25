import { describe, expect, it } from "vitest";

import { detectProject } from "../src/detect.js";
import { bunDetector } from "../src/detectors/bun.js";
import { DetectorRegistry } from "../src/registry.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("fixtures", () => {
  it("bun-project fixture is detected as a Bun project", async () => {
    const registry = new DetectorRegistry().register(bunDetector);

    const detection = await detectProject(registry, {
      cwd: join(fixturesDir, "bun-project"),
    });

    expect(detection.root).toBe(join(fixturesDir, "bun-project"));
    expect(detection.isProject).toBe(true);

    const bun = detection.detectors.get("bun");
    expect(bun?.detected).toBe(true);
    expect(bun?.detections.map((d) => d.marker)).toEqual(["bun.lock"]);
  });
});
