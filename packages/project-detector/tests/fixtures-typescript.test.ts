import { describe, expect, it } from "vitest";

import { detectProject } from "../src/detect.js";
import { typescriptDetector } from "../src/detectors/typescript.js";
import { DetectorRegistry } from "../src/registry.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("fixtures", () => {
  it("typescript-project fixture is detected as a TypeScript project", async () => {
    const registry = new DetectorRegistry().register(typescriptDetector);

    const detection = await detectProject(registry, {
      cwd: join(fixturesDir, "typescript-project"),
    });

    expect(detection.root).toBe(join(fixturesDir, "typescript-project"));
    expect(detection.isProject).toBe(true);

    const typescript = detection.detectors.get("typescript");
    expect(typescript?.detected).toBe(true);
    const byMarker = new Map(typescript?.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("tsconfig.json#target")).toBe("ES2022");
    expect(byMarker.get("package.json#typescript")).toBe("^6.0.3");
  });
});
