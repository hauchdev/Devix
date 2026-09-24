import { describe, expect, it } from "vitest";

import { ProjectDetectorError } from "../src/errors.js";
import { DetectorRegistry } from "../src/registry.js";
import type { DetectionResult, Detector } from "../src/types.js";

function makeDetector(id: string, markers: readonly string[] = ["marker.txt"]): Detector {
  return {
    id,
    name: id,
    markers,
    async detect(): Promise<DetectionResult> {
      return { detected: false, detections: [] };
    },
  };
}

describe("DetectorRegistry", () => {
  it("registers detectors and preserves order", () => {
    const registry = new DetectorRegistry();
    registry.register(makeDetector("b"));
    registry.register(makeDetector("a"));

    expect(registry.ids()).toEqual(["b", "a"]);
    expect(registry.all().map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("supports registerAll and chaining", () => {
    const registry = new DetectorRegistry().registerAll([makeDetector("x"), makeDetector("y")]);

    expect(registry.ids()).toEqual(["x", "y"]);
  });

  it("rejects duplicate ids", () => {
    const registry = new DetectorRegistry().register(makeDetector("dup"));

    expect(() => registry.register(makeDetector("dup"))).toThrowError(ProjectDetectorError);
    expect(() => registry.register(makeDetector("dup"))).toThrowError(/already registered/);
  });

  it("rejects empty ids and detectors without markers", () => {
    const registry = new DetectorRegistry();

    expect(() => registry.register(makeDetector(""))).toThrowError(ProjectDetectorError);
    expect(() => registry.register(makeDetector("no-markers", []))).toThrowError(
      /at least one marker/,
    );
  });

  it("get returns the detector or throws EUNKNOWN_DETECTOR", () => {
    const registry = new DetectorRegistry().register(makeDetector("known"));

    expect(registry.get("known").id).toBe("known");
    expect(registry.has("known")).toBe(true);

    try {
      registry.get("missing");
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: "ProjectDetectorError",
        code: "EUNKNOWN_DETECTOR",
      });
    }
  });

  it("has returns false for unregistered ids", () => {
    expect(new DetectorRegistry().has("anything")).toBe(false);
  });
});
