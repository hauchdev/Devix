import { describe, expect, it } from "vitest";

import { detectProject } from "../src/detect.js";
import { rustDetector } from "../src/detectors/rust.js";
import { DetectorRegistry } from "../src/registry.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("fixtures", () => {
  it("rust-project fixture is detected as a Rust project", async () => {
    const registry = new DetectorRegistry().register(rustDetector);

    const detection = await detectProject(registry, {
      cwd: join(fixturesDir, "rust-project"),
    });

    expect(detection.root).toBe(join(fixturesDir, "rust-project"));
    expect(detection.isProject).toBe(true);

    const rust = detection.detectors.get("rust");
    expect(rust?.detected).toBe(true);
    const byMarker = new Map(rust?.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("Cargo.toml")).toBe("devix-fixture-rust-project");
    expect(byMarker.get("Cargo.toml#edition")).toBe("2021");
    expect(byMarker.has("Cargo.lock")).toBe(true);
  });
});
