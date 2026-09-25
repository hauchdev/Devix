import { describe, expect, it } from "vitest";

import * as api from "../src/index.js";

describe("public API surface", () => {
  it("exports the expected functions and detector objects", () => {
    expect(Object.keys(api).sort()).toEqual([
      "DetectorRegistry",
      "ProjectDetectorError",
      "bukkitDetector",
      "bunDetector",
      "bungeecordDetector",
      "createDefaultRegistry",
      "defaultDetectors",
      "detectProject",
      "dockerDetector",
      "fabricDetector",
      "findProjectRoot",
      "forgeDetector",
      "gitDetector",
      "javaDetector",
      "neoforgeDetector",
      "nodeDetector",
      "npmDetector",
      "pnpmDetector",
      "pythonDetector",
      "quiltDetector",
      "rustDetector",
      "spongeDetector",
      "summarizeProject",
      "typescriptDetector",
      "velocityDetector",
      "yarnDetector",
    ]);
  });
});
