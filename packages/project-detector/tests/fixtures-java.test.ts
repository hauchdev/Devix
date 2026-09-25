import { describe, expect, it } from "vitest";

import { detectProject } from "../src/detect.js";
import { javaDetector } from "../src/detectors/java.js";
import { DetectorRegistry } from "../src/registry.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("fixtures", () => {
  it("java-project fixture is detected as a Java project", async () => {
    const registry = new DetectorRegistry().register(javaDetector);

    const detection = await detectProject(registry, {
      cwd: join(fixturesDir, "java-project"),
    });

    expect(detection.root).toBe(join(fixturesDir, "java-project"));
    expect(detection.isProject).toBe(true);

    const java = detection.detectors.get("java");
    expect(java?.detected).toBe(true);
    const byMarker = new Map(java?.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("pom.xml")).toBe("devix-fixture-java-project");
    expect(byMarker.has("build.gradle")).toBe(true);
  });
});
