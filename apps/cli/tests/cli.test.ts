import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const binPath = join(cliRoot, "bin", "run.js");

async function runCli(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [binPath, ...args], {
    cwd: cwd ?? cliRoot,
    encoding: "utf8",
  });
}

describe("devix CLI (compiled binary)", () => {
  it("prints the version with --version", async () => {
    const { stdout } = await runCli(["--version"]);

    expect(stdout).toMatch(/^@devix\/cli\/\d+\.\d+\.\d+/);
  });

  it("prints usage with --help", async () => {
    const { stdout } = await runCli(["--help"]);

    expect(stdout).toContain("USAGE");
    expect(stdout).toContain("$ devix [COMMAND]");
    expect(stdout).toContain("detect");
  });

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
  });

  it("reports no project markers in an empty temporary directory", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-empty-"));
    try {
      const { stdout } = await runCli(["detect", "--json"], empty);

      const parsed = JSON.parse(stdout) as { isProject: boolean };
      expect(parsed.isProject).toBe(false);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });

  it("doctor prints an environment section with node present", async () => {
    const { stdout } = await runCli(["doctor"]);

    expect(stdout).toContain("Environment:");
    expect(stdout).toMatch(/✓ Node\.js \d+\.\d+/);
    expect(stdout).toContain("Project:");
  });

  it("doctor --json emits parseable report", async () => {
    const { stdout } = await runCli(["doctor", "--json"]);

    const parsed = JSON.parse(stdout) as {
      environment: { checks: { id: string; status: string }[] };
      project: { isProject: boolean };
    };
    const ids = parsed.environment.checks.map((c) => c.id);
    expect(ids).toEqual(["node", "pnpm", "npm", "yarn", "bun", "git"]);
    const node = parsed.environment.checks.find((c) => c.id === "node");
    expect(node?.status).toBe("ok");
  }, 30_000);
});
