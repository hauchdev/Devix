import { describe, expect, it } from "vitest";

import { ConfigError } from "../src/errors.js";
import { parseConfigContent } from "../src/parse.js";

describe("parseConfigContent", () => {
  it("parses valid JSON objects, arrays and primitives", () => {
    expect(parseConfigContent("a.json", '{"name":"devix"}')).toEqual({ name: "devix" });
    expect(parseConfigContent("a.json", "[1,2]")).toEqual([1, 2]);
    expect(parseConfigContent("a.json", "null")).toBeNull();
  });

  it("throws ConfigError EPARSE on malformed JSON", () => {
    expect(() => parseConfigContent("bad.json", "{oops")).toThrowError(ConfigError);

    try {
      parseConfigContent("bad.json", "{oops");
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({ code: "EPARSE", path: "bad.json" });
    }
  });
});
