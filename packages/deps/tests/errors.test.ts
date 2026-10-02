import { describe, expect, it } from "vitest";

import { DepsError } from "../src/index.js";

describe("DepsError", () => {
  it("names the missing package manager", () => {
    const error = DepsError.pmNotFound("pnpm");

    expect(error).toBeInstanceOf(DepsError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DepsError");
    expect(error.code).toBe("EPM_NOT_FOUND");
    expect(error.message).toContain("pnpm");
  });

  it("names the directory when nothing could be detected", () => {
    const error = DepsError.pmUndetected("/tmp/project");

    expect(error.code).toBe("EPM_UNDETECTED");
    expect(error.message).toContain("/tmp/project");
  });

  it("reports a failed delegated command with its exit code", () => {
    const error = DepsError.commandFailed("npm", "outdated", 1);

    expect(error.code).toBe("ECOMMAND_FAILED");
    expect(error.message).toContain("npm outdated");
    expect(error.message).toContain("1");
  });

  it("carries an invalid-usage message verbatim", () => {
    const error = DepsError.invalid("operation must be one of list, outdated, audit");

    expect(error.code).toBe("EINVALID");
    expect(error.message).toBe("operation must be one of list, outdated, audit");
  });

  it("keeps a cause when one is supplied", () => {
    const cause = new Error("underlying");
    const error = new (DepsError as unknown as new (
      code: string,
      message: string,
      options?: { cause?: unknown },
    ) => DepsError)("EINVALID", "wrapped", { cause });

    expect(error.cause).toBe(cause);
  });
});
