import { describe, expect, it } from "vitest";

import { ShellError } from "../src/errors.js";
import { assertSafeCmdArgs, hasCmdMetacharacters, isCmdShim } from "../src/windows.js";

describe("isCmdShim", () => {
  it("detects .cmd and .bat shims regardless of casing", () => {
    expect(isCmdShim("C:\\tools\\pnpm.CMD")).toBe(true);
    expect(isCmdShim("C:\\tools\\pnpm.cmd")).toBe(true);
    expect(isCmdShim("/tools/run.bat")).toBe(true);
  });

  it("rejects non-shim executables", () => {
    expect(isCmdShim("C:\\Program Files\\nodejs\\node.exe")).toBe(false);
    expect(isCmdShim("/usr/bin/node")).toBe(false);
    expect(isCmdShim("node")).toBe(false);
  });
});

describe("hasCmdMetacharacters", () => {
  it("flags every cmd metacharacter", () => {
    for (const dangerous of ["a&b", "a|b", "a<b", "a>b", "(x)", "a^b", "%VAR%", "a!b", '"q"']) {
      expect(hasCmdMetacharacters(dangerous), dangerous).toBe(true);
    }
  });

  it("allows plain arguments including spaces and dashes", () => {
    expect(hasCmdMetacharacters("--force")).toBe(false);
    expect(hasCmdMetacharacters("my file.txt")).toBe(false);
    expect(hasCmdMetacharacters("https://example.com")).toBe(false);
  });
});

describe("assertSafeCmdArgs", () => {
  it("throws typed EUNSAFE_ARG listing the rejected argument", () => {
    try {
      assertSafeCmdArgs("pnpm", ["install", "a&calc"]);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ShellError);
      expect((error as ShellError).code).toBe("EUNSAFE_ARG");
      expect((error as ShellError).message).toContain("a&calc");
    }
  });

  it("passes clean arguments silently", () => {
    expect(() => assertSafeCmdArgs("pnpm", ["install", "--save-dev"])).not.toThrow();
  });
});
