import { describe, expect, it } from "vitest";

import { FilesystemError, toFilesystemError } from "../src/errors.js";

describe("FilesystemError", () => {
  it("exposes stable codes and the offending path", () => {
    const error = FilesystemError.notFound("some/missing/path");

    expect(error.code).toBe("ENOENT");
    expect(error.path).toBe("some/missing/path");
    expect(error.name).toBe("FilesystemError");
  });

  it("keeps the original error as cause for I/O failures", () => {
    const original = new Error("disk on fire");
    const error = FilesystemError.io("some/path", original);

    expect(error.code).toBe("EIO");
    expect(error.cause).toBe(original);
  });

  it("normalizes node:fs errno errors into typed errors", () => {
    const raw = Object.assign(new Error("nope"), { code: "ENOENT" });

    const error = toFilesystemError("x.txt", raw);

    expect(error).toBeInstanceOf(FilesystemError);
    expect(error.code).toBe("ENOENT");
    expect(error.path).toBe("x.txt");
  });

  it("maps unknown errnos to EIO and passes typed errors through", () => {
    const weird = Object.assign(new Error("boom"), { code: "EPERM" });
    expect(toFilesystemError("f", weird).code).toBe("EIO");

    const typed = FilesystemError.notFound("f");
    expect(toFilesystemError("f", typed)).toBe(typed);
  });
});
