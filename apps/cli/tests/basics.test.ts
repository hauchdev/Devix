import { describe, expect, it } from "vitest";

import { runCli } from "./helpers/subprocess.js";

describe("devix CLI (compiled binary) — basics", () => {
  it("prints the version with --version", async () => {
    const { stdout } = await runCli(["--version"]);

    expect(stdout).toMatch(/^devix-cli\/\d+\.\d+\.\d+/);
  }, 30_000);

  it("prints usage with --help", async () => {
    const { stdout } = await runCli(["--help"]);

    expect(stdout).toContain("USAGE");
    expect(stdout).toContain("$ devix [COMMAND]");
    expect(stdout).toContain("detect");
  }, 30_000);

  it("detects the CLI's own package from its directory", async () => {
    const { stdout } = await runCli(["detect", "--json"]);

    const parsed = JSON.parse(stdout) as {
      root: string;
      isProject: boolean;
      languages: string[];
      packageManagers: string[];
      tools: string[];
    };
    expect(parsed.isProject).toBe(true);
    expect(parsed.languages).toContain("node");
    expect(parsed.languages).toContain("typescript");
  }, 30_000);

  it("reports no project markers in an empty temporary directory", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-empty-"));
    try {
      const { stdout } = await runCli(["detect", "--json"], empty);

      const parsed = JSON.parse(stdout) as { isProject: boolean };
      expect(parsed.isProject).toBe(false);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  }, 30_000);
});
