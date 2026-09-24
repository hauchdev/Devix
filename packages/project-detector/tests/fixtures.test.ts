import { describe, expect, it } from "vitest";

import { detectProject } from "../src/detect.js";
import { nodeDetector } from "../src/detectors/node.js";
import { DetectorRegistry } from "../src/registry.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("fixtures", () => {
  it("node-project fixture is detected as a Node.js project", async () => {
    const registry = new DetectorRegistry().register(nodeDetector);

    const detection = await detectProject(registry, {
      cwd: join(fixturesDir, "node-project"),
    });

    expect(detection.root).toBe(join(fixturesDir, "node-project"));
    expect(detection.isProject).toBe(true);

    const node = detection.detectors.get("node");
    expect(node?.detected).toBe(true);
    const byMarker = new Map(node?.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("package.json#name")).toBe("devix-fixture-node-project");
    expect(byMarker.get("package.json#packageManager")).toBe("pnpm@12.5.1");
    expect(byMarker.get("package.json#engines")).toBe("node@>=22");
  });
});
