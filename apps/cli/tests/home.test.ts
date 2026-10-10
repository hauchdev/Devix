import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "./helpers/subprocess.js";

describe("devix with no arguments", () => {
  it("shows the home panel instead of the help text", async () => {
    const { stdout } = await runCli([]);

    // A bare `devix` is an introduction, not a command reference.
    expect(stdout).toContain("your environment, your project, your next step");
    expect(stdout).not.toContain("USAGE");
    expect(stdout).not.toContain("TOPICS");
  }, 30_000);

  it("names the sections a newcomer looks for", async () => {
    const { stdout } = await runCli([]);

    expect(stdout).toContain("Here");
    expect(stdout).toContain("Stack");
    expect(stdout).toContain("Tools");
    expect(stdout).toContain("Git");
    expect(stdout).toContain("Next");
  }, 30_000);

  it("always points at the full help from the panel", async () => {
    const { stdout } = await runCli([]);

    expect(stdout).toContain("devix --help");
  }, 30_000);

  it("reports a directory with no project markers without failing", async () => {
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-home-empty-"));

    const { stdout } = await runCli(["--here", "-d", empty]);

    expect(stdout).toContain("Not a project");
    expect(stdout).toContain("nothing detected");
  }, 30_000);

  it("describes a Next.js project it detects", async () => {
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-home-next-"));
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "app", dependencies: { next: "15.0.0" } }),
      "utf8",
    );

    const { stdout } = await runCli(["-d", dir]);

    expect(stdout).toContain("node project");
    expect(stdout).toContain("next");
  }, 30_000);

  it("degrades to ascii with no color when asked", async () => {
    const { stdout } = await runCli(["--no-color"], undefined, undefined, {
      DEVIX_UNICODE: "0",
    });

    // Nothing that a legacy console would render as mojibake.
    expect(stdout).not.toContain("─");
    expect(stdout).not.toContain("╭");
    expect(stdout).not.toContain("›");
    expect(stdout).toContain("Here");
    // No ANSI escapes anywhere in a no-color run.
    expect(stdout).not.toContain(String.fromCharCode(27));
  }, 30_000);

  it("emits a machine-readable snapshot with --json", async () => {
    const { stdout } = await runCli(["--json"]);

    const parsed = JSON.parse(stdout) as {
      root: string;
      summary: string;
      isProject: boolean;
      health: { ready: number; total: number };
      next: { command: string; because: string }[];
    };

    expect(typeof parsed.root).toBe("string");
    expect(typeof parsed.summary).toBe("string");
    expect(parsed.isProject).toBe(true);
    expect(parsed.health.total).toBeGreaterThan(0);
    expect(Array.isArray(parsed.next)).toBe(true);
    expect(parsed.next[0]).toHaveProperty("command");
  }, 30_000);

  it("prints nothing with --quiet", async () => {
    const { stdout } = await runCli(["--quiet"]);

    expect(stdout.trim()).toBe("");
  }, 30_000);

  it("is reachable by name as well", async () => {
    const bare = await runCli([]);
    const named = await runCli(["home"]);

    // Both reach the same panel: the name is not a second code path.
    expect(named.stdout).toContain("your environment, your project, your next step");
    expect(named.stdout.length).toBe(bare.stdout.length);
  }, 60_000);

  it("still reaches oclif's own help and version", async () => {
    const help = await runCli(["--help"]);
    const version = await runCli(["--version"]);

    expect(help.stdout).toContain("USAGE");
    expect(help.stdout).toContain("home");
    expect(version.stdout).toMatch(/^devix-cli\/\d+\.\d+\.\d+/);
  }, 60_000);

  it("accepts a flag before the implicit command", async () => {
    // `devix --no-color` must not make oclif read the flag as a command.
    const { stdout } = await runCli(["--no-color"]);

    expect(stdout).toContain("Here");
  }, 30_000);

  it("shows the detected stack as a tree with --verbose", async () => {
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-home-tree-"));
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({
        name: "app",
        dependencies: { next: "15.0.0" },
        devDependencies: { typescript: "5" },
      }),
      "utf8",
    );
    await writeFile(join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

    const { stdout } = await runCli(["--verbose", "-d", dir]);

    expect(stdout).toContain("Detected");
    expect(stdout).toContain("Languages");
    expect(stdout).toContain("Package managers");
    expect(stdout).toContain("pnpm");
  }, 30_000);

  it("says so rather than drawing an empty tree when nothing is detected", async () => {
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-home-tree-empty-"));

    const { stdout } = await runCli(["--verbose", "--here", "-d", empty]);

    expect(stdout).toContain("Detected");
    expect(stdout).toContain("No markers found");
  }, 30_000);
});
