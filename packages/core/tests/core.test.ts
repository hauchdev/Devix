import { describe, expect, it } from "vitest";

import { DEVIX_VERSION } from "../src/index.js";

describe("@devix-cli/core", () => {
  it("exports a valid semantic version", () => {
    expect(DEVIX_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
