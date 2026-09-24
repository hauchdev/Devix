import { describe, expect, it } from "vitest";

import { ConfigError } from "../src/errors.js";

describe("ConfigError", () => {
  it("builds EINVALID_CONFIG with problem details", () => {
    const error = ConfigError.invalidConfig("devix.json", ['"name" must be a string']);

    expect(error).toMatchObject({
      name: "ConfigError",
      code: "EINVALID_CONFIG",
      path: "devix.json",
    });
    expect(error.message).toContain('"name" must be a string');
  });

  it("builds EINVALID_CONFIG without problems", () => {
    const error = ConfigError.invalidConfig("devix.json", []);

    expect(error.code).toBe("EINVALID_CONFIG");
    expect(error.message).toBe("Invalid devix config");
  });

  it("builds EUNSUPPORTED_FORMAT", () => {
    const error = ConfigError.unsupportedFormat("devix.yaml");

    expect(error).toMatchObject({
      code: "EUNSUPPORTED_FORMAT",
      path: "devix.yaml",
    });
  });

  it("builds EPARSE preserving the cause", () => {
    const cause = new SyntaxError("Unexpected token");
    const error = ConfigError.parse("devix.json", cause);

    expect(error).toMatchObject({ code: "EPARSE", path: "devix.json" });
    expect(error.cause).toBe(cause);
  });

  it("builds EIO with a non-Error cause", () => {
    const error = ConfigError.io("devix.json", "boom");

    expect(error).toMatchObject({ code: "EIO", path: "devix.json" });
    expect(error.message).toContain("boom");
  });
});
