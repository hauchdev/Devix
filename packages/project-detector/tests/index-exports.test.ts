import { describe, expect, it } from "vitest";

import * as api from "../src/index.js";

describe("public API surface", () => {
  it("exports the expected functions and detector objects", () => {
    expect(Object.keys(api).sort()).toEqual([
      "DetectorRegistry",
      "ProjectDetectorError",
      "bunDetector",
      "createDefaultRegistry",
      "defaultDetectors",
      "detectProject",
      "dockerDetector",
      "findProjectRoot",
      "gitDetector",
      "javaDetector",
      "nodeDetector",
      "npmDetector",
      "pnpmDetector",
      "pythonDetector",
      "rustDetector",
      "summarizeProject",
      "typescriptDetector",
      "yarnDetector",
    ]);
  });
});
