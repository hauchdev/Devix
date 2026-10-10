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

  it("walks up to the project root by default and stays put with --here", async () => {
    const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const project = await mkdtemp(join(tmpdir(), "devix-cli-here-"));
    const nested = join(project, "nested", "deeper");
    try {
      await mkdir(nested, { recursive: true });
      await writeFile(join(project, "package.json"), JSON.stringify({ name: "outer" }), "utf8");

      // Default: the nearest marker upward wins, so the root is the
      // project that contains the nested directory.
      const walked = await runCli(["detect", "--json"], nested);
      const walkedParsed = JSON.parse(walked.stdout) as { root: string; isProject: boolean };
      expect(walkedParsed.isProject).toBe(true);
      expect(walkedParsed.root).toBe(project);

      // --here: only this directory is inspected, so it is not a project.
      const here = await runCli(["detect", "--json", "--here"], nested);
      const hereParsed = JSON.parse(here.stdout) as { root: string; isProject: boolean };
      expect(hereParsed.isProject).toBe(false);
      expect(hereParsed.root).toBe(nested);
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  }, 30_000);

  it("reports no project markers in an empty temporary directory", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-empty-"));
    try {
      // `--here` pins the inspection to this directory: without it the
      // detector walks up and a machine whose home has a stray lockfile
      // reports a project that is not the one under test.
      const { stdout } = await runCli(["detect", "--json", "--here"], empty);

      const parsed = JSON.parse(stdout) as { isProject: boolean };
      expect(parsed.isProject).toBe(false);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  }, 30_000);
});
