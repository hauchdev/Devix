import { describe, expect, it } from "vitest";

import { runCli } from "./helpers/subprocess.js";

const withTempDir = async (prefix: string, body: (dir: string) => Promise<void>): Promise<void> => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), prefix));
  try {
    await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

describe("devix doctor and status", () => {
  it("doctor prints an environment section with node present", async () => {
    const { stdout } = await runCli(["doctor"]);

    expect(stdout).toMatch(/Environment \(\d+\)/);
    expect(stdout).toMatch(/Node\.js\s+\d+\.\d+/);
    expect(stdout).toContain("Project");
  }, 30_000);

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

  it("doctor reports an empty directory without error", async () => {
    await withTempDir("devix-cli-doctor-empty-", async (dir) => {
      const { stdout } = await runCli(["doctor", "--json", "--here"], dir);

      const parsed = JSON.parse(stdout) as { project: { isProject: boolean } };
      expect(parsed.project.isProject).toBe(false);
    });
  }, 30_000);

  it("status combines project, environment, git and docker", async () => {
    const { stdout } = await runCli(["status", "--no-color"]);

    expect(stdout).toContain("devix status");
    expect(stdout).toContain("Project");
    expect(stdout).toMatch(/Environment \(\d+\)/);
    expect(stdout).toContain("Git");
    expect(stdout).toContain("Docker");
  }, 30_000);

  it("status degrades to ascii and no color on a legacy terminal", async () => {
    // The helper already pins ASCII for every other test, so this one has
    // to ask for the Unicode branch explicitly to prove the switch works
    // in both directions rather than just re-asserting the default.
    const unicode = await runCli(["status"], undefined, undefined, {
      DEVIX_UNICODE: "1",
    });
    expect(unicode.stdout).toContain("─");

    const legacy = await runCli(["status"], undefined, undefined, {
      DEVIX_UNICODE: "0",
    });

    // No ANSI escapes and no box drawing: a legacy Windows console or a
    // piped log file must stay readable.
    expect(legacy.stdout).not.toContain(String.fromCharCode(27));
    expect(legacy.stdout).not.toContain("─");
    expect(legacy.stdout).not.toContain("✓");
    expect(legacy.stdout).toContain("Project");
    // Every line stays printable ASCII: a legacy console renders anything
    // else as mojibake.
    expect(legacy.stdout).toMatch(/^[\x20-\x7E\r\n]*$/);
  }, 30_000);

  it("keeps the ascii layout even when the environment says utf-8", async () => {
    // The regression this guards: on a Linux runner the locale is UTF-8,
    // so `detectUnicode` said yes and every `-` rule came out as `─`.
    // The layout assertions above are written in ASCII, so a helper that
    // inherits the machine's locale makes them fail on CI and pass
    // locally. Pinning DEVIX_UNICODE has to win over the locale.
    const { stdout } = await runCli(["status"], undefined, undefined, {
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
    });

    expect(stdout).not.toContain("─");
    expect(stdout).toContain("Project");
  }, 30_000);

  it("status --json emits all sections parseable", async () => {
    const { stdout } = await runCli(["status", "--json"]);

    const parsed = JSON.parse(stdout) as {
      project: unknown;
      environment: unknown;
      git: unknown;
      docker: unknown;
    };
    expect(parsed.project).toBeDefined();
    expect(parsed.environment).toBeDefined();
    expect(parsed.git).toBeDefined();
    expect(parsed.docker).toBeDefined();
  }, 30_000);
});
