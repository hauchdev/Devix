import { describe, expect, it } from "vitest";

import {
  createToolProbe,
  defaultServices,
  parseVersionOutput,
  type ProbeResult,
} from "../src/index.js";

/** A probe whose runner replays a scripted result. */
function probeWith(result: ProbeResult | Error) {
  return createToolProbe(async () => {
    if (result instanceof Error) {
      throw result;
    }
    return result;
  });
}

const OK = (stdout: string): ProbeResult => ({ exitCode: 0, stdout, stderr: "" });

describe("parseVersionOutput", () => {
  it("extracts a plain version", () => {
    expect(parseVersionOutput("22.20.4\n")).toBe("22.20.4");
  });

  it("extracts from a prefixed line", () => {
    expect(parseVersionOutput("git version 2.47.1.windows.1")).toBe("2.47.1.windows.1");
  });

  it("ignores leading noise", () => {
    expect(parseVersionOutput("v10.9.0")).toBe("10.9.0");
  });

  it("returns undefined when there is no version", () => {
    expect(parseVersionOutput("no version here")).toBeUndefined();
    expect(parseVersionOutput("")).toBeUndefined();
  });

  it("keeps prerelease and build suffixes", () => {
    expect(parseVersionOutput("1.0.0-beta.1+build")).toBe("1.0.0-beta.1+build");
  });
});

describe("createToolProbe.version", () => {
  it("reads the version from stdout", async () => {
    expect(await probeWith(OK("v22.20.4\n")).version("node", "--version")).toBe("22.20.4");
  });

  it("falls back to stderr, which some tools use", async () => {
    const probe = probeWith({ exitCode: 0, stdout: "", stderr: "ruby 3.3.0" });

    expect(await probe.version("ruby", "-v")).toBe("3.3.0");
  });

  it("returns undefined on a non-zero exit", async () => {
    const probe = probeWith({ exitCode: 1, stdout: "9.9.9", stderr: "" });

    expect(await probe.version("tool", "--version")).toBeUndefined();
  });

  it("returns undefined when the process cannot be spawned", async () => {
    expect(await probeWith(new Error("ENOENT")).version("tool", "--version")).toBeUndefined();
  });

  it("returns undefined when the output carries no version", async () => {
    expect(await probeWith(OK("unknown")).version("tool", "--version")).toBeUndefined();
  });

  it("passes the version argument through to the runner", async () => {
    const seen: { command: string; args: readonly string[] }[] = [];
    const probe = createToolProbe(async (command, args) => {
      seen.push({ command, args });
      return OK("1.2.3");
    });

    await probe.version("pnpm", "--version");

    expect(seen).toEqual([{ command: "pnpm", args: ["--version"] }]);
  });
});

describe("defaultServices", () => {
  // Probes the real machine. It only asserts the contract: a version
  // when the tool is there, `undefined` when it is not.
  it("never throws and reports a version or nothing", { timeout: 20_000 }, async () => {
    expect(await defaultServices.getToolVersion("node", "--version")).toMatch(/^\d+\.\d+/);
    expect(
      await defaultServices.getToolVersion("definitely-not-a-real-tool", "--version"),
    ).toBeUndefined();
  });
});
