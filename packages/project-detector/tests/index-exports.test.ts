import { describe, expect, it } from "vitest";

import * as api from "../src/index.js";

describe("public API surface", () => {
  it("exports the expected functions and detector objects", () => {
    expect(Object.keys(api).sort()).toEqual([
      "DetectorRegistry",
      "ProjectDetectorError",
      "WEB_FRAMEWORK_IDS",
      "bukkitDetector",
      "bunDetector",
      "bungeecordDetector",
      "createDefaultRegistry",
      "defaultDetectors",
      "detectMinecraftPlatforms",
      "detectProject",
      "detectWeb",
      "dockerDetector",
      "fabricDetector",
      "findProjectRoot",
      "forgeDetector",
      "gitDetector",
      "isStaticWebFramework",
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
      "webDetector",
      "webFrameworkIdForMarker",
      "yarnDetector",
    ]);
  });
});
