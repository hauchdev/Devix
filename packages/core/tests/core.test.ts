import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DEVIX_VERSION } from "../src/index.js";

describe("@devix-cli/core", () => {
  it("exports a valid semantic version", () => {
    expect(DEVIX_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("keeps DEVIX_VERSION in sync with the package manifest", () => {
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      version?: string;
    };

    expect(DEVIX_VERSION).toBe(manifest.version);
  });
});
