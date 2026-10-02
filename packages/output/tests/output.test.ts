import { describe, expect, it } from "vitest";

import { err, ExitCode, formatJson, ok } from "../src/index.js";

describe("output primitives", () => {
  it("has the expected exit codes", () => {
    expect(ExitCode.Success).toBe(0);
    expect(ExitCode.Failure).toBe(1);
    expect(ExitCode.Unexpected).toBe(2);
  });

  it("builds ok outputs", () => {
    const output = ok({ hello: "world" });
    expect(output.ok).toBe(true);
    expect(output.data).toEqual({ hello: "world" });
  });

  it("builds error outputs", () => {
    const output = err("EINVALID", "bad input");
    expect(output.ok).toBe(false);
    expect(output.error.code).toBe("EINVALID");
    expect(output.error.message).toBe("bad input");
  });

  it("includes optional details in errors", () => {
    const output = err("EINVALID", "bad input", { field: "name" });
    expect(output.error.details).toEqual({ field: "name" });
  });

  it("formats output as pretty JSON", () => {
    const output = ok({ count: 1 });
    expect(formatJson(output)).toContain('"ok": true');
    expect(formatJson(output)).toContain('"count": 1');
  });
});
