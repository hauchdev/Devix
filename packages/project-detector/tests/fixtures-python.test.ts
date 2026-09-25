import { describe, expect, it } from "vitest";

import { detectProject } from "../src/detect.js";
import { pythonDetector } from "../src/detectors/python.js";
import { DetectorRegistry } from "../src/registry.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("fixtures", () => {
  it("python-project fixture is detected as a Python project", async () => {
    const registry = new DetectorRegistry().register(pythonDetector);

    const detection = await detectProject(registry, {
      cwd: join(fixturesDir, "python-project"),
    });

    expect(detection.root).toBe(join(fixturesDir, "python-project"));
    expect(detection.isProject).toBe(true);

    const python = detection.detectors.get("python");
    expect(python?.detected).toBe(true);
    const byMarker = new Map(python?.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("pyproject.toml")).toBe("devix-fixture-python-project");
    expect(byMarker.has("requirements.txt")).toBe(true);
  });
});
