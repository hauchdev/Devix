import { describe, expect, it } from "vitest";

import { detectProject } from "../src/detect.js";
import { dockerDetector } from "../src/detectors/docker.js";
import { DetectorRegistry } from "../src/registry.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("fixtures", () => {
  it("docker-project fixture is detected as a Docker project", async () => {
    const registry = new DetectorRegistry().register(dockerDetector);

    const detection = await detectProject(registry, {
      cwd: join(fixturesDir, "docker-project"),
    });

    expect(detection.root).toBe(join(fixturesDir, "docker-project"));
    expect(detection.isProject).toBe(true);

    const docker = detection.detectors.get("docker");
    expect(docker?.detected).toBe(true);
    expect(docker?.detections.map((d) => d.marker)).toEqual(["Dockerfile", "compose.yml"]);
  });
});
