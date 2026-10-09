import { describe, expect, it } from "vitest";

import { runCli } from "./helpers/subprocess.js";

describe("devix minecraft", () => {
  it("minecraft check reports no platforms outside Minecraft projects", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-check-empty-"));
    try {
      const { stdout } = await runCli(["minecraft", "check", "--json"], empty);

      const parsed = JSON.parse(stdout) as { isMinecraft: boolean; platforms: unknown[] };
      expect(parsed.isMinecraft).toBe(false);
      expect(parsed.platforms).toEqual([]);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft check detects a scaffolded fabric project and honors the requested platform", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-check-fabric-"));
    try {
      await runCli(["minecraft", "init", "fabric", "CheckMod", "--here"], dir);

      const { stdout } = await runCli(["minecraft", "check", "--json"], dir);
      const parsed = JSON.parse(stdout) as {
        isMinecraft: boolean;
        platforms: { id: string; detail: string }[];
        requested?: { id: string; detected: boolean };
      };
      expect(parsed.isMinecraft).toBe(true);
      expect(parsed.platforms[0]?.id).toBe("fabric");
      expect(parsed.platforms[0]?.detail).toBe("checkmod");

      const requested = await runCli(["minecraft", "check", "fabric", "--json"], dir);
      const requestedParsed = JSON.parse(requested.stdout) as {
        requested: { id: string; detected: boolean };
      };
      expect(requestedParsed.requested).toEqual({ id: "fabric", detected: true });

      const human = await runCli(["minecraft", "check"], dir);
      expect(human.stdout).toMatch(/fabric\s+checkmod/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft check rejects unknown platforms with a clear message", async () => {
    await expect(runCli(["minecraft", "check", "wurm"])).rejects.toThrow(/Unknown platform/i);
  }, 30_000);

  it("minecraft run prints the launch command for a scaffolded project", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-run-fabric-"));
    try {
      await runCli(["minecraft", "init", "fabric", "RunMod", "--here"], dir);

      const { stdout } = await runCli(["minecraft", "run"], dir);
      expect(stdout).toContain("Run with");
      expect(stdout).toContain("runClient");
      expect(stdout).toMatch(/^\s+Root\s+/m);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft list shows the kinds, platforms and modules", async () => {
    const { stdout } = await runCli(["minecraft", "list"]);

    expect(stdout).toMatch(/^Project kinds\s+\d+\s+-+$/m);
    expect(stdout).toMatch(/^Platforms\s+\d+\s+-+$/m);
    expect(stdout).toMatch(/^Optional modules\s+\d+\s+-+$/m);
    expect(stdout).toContain("neoforge");
  }, 30_000);

  it("minecraft build prints the build command for a scaffolded project", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-build-fabric-"));
    try {
      await runCli(["minecraft", "init", "fabric", "BuildMod", "--here"], dir);

      const { stdout } = await runCli(["minecraft", "build"], dir);
      expect(stdout).toContain("Build with");
      expect(stdout).toContain("build");
      // Building must never launch the game.
      expect(stdout).not.toContain("runClient");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft build emits parseable json", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-build-json-"));
    try {
      await runCli(["minecraft", "init", "paper", "JsonMod", "--here"], dir);

      const { stdout } = await runCli(["minecraft", "build", "--json"], dir);
      const parsed = JSON.parse(stdout) as { command: string; platforms: string[] };

      expect(parsed.command).toContain("build");
      // The Paper detector reports the bukkit family id.
      expect(parsed.platforms).toContain("bukkit");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft doctor reports the checks of a scaffolded project", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-doctor-mc-"));
    try {
      await runCli(["minecraft", "init", "fabric", "DoctorMod", "--here"], dir);

      const { stdout } = await runCli(["minecraft", "doctor"], dir);

      expect(stdout).toContain("devix minecraft doctor");
      expect(stdout).toContain("Platforms");
      expect(stdout).toContain("fabric");
      expect(stdout).toContain("Checks");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft doctor emits parseable json with a check list", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-doctor-json-"));
    try {
      await runCli(["minecraft", "init", "paper", "DoctorJson", "--here"], dir);

      const { stdout } = await runCli(["minecraft", "doctor", "--json"], dir);
      const parsed = JSON.parse(stdout) as {
        isMinecraft: boolean;
        platforms: string[];
        checks: { id: string; status: string }[];
      };

      expect(parsed.isMinecraft).toBe(true);
      expect(parsed.platforms).toContain("bukkit");
      expect(parsed.checks.map((check) => check.id)).toContain("project");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft doctor reports a directory that is not a Minecraft project", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-doctor-empty-"));
    try {
      const { stdout } = await runCli(["minecraft", "doctor", "--json"], dir);
      const parsed = JSON.parse(stdout) as { isMinecraft: boolean };

      expect(parsed.isMinecraft).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft clean prints the clean command for a scaffolded project", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-clean-fabric-"));
    try {
      await runCli(["minecraft", "init", "fabric", "CleanMod", "--here"], dir);

      const { stdout } = await runCli(["minecraft", "clean"], dir);
      expect(stdout).toContain("Clean with");
      expect(stdout).toContain("clean");
      // Cleaning must not build or launch anything.
      expect(stdout).not.toContain("runClient");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft with no operation fails cleanly off a TTY instead of hanging", async () => {
    // A menu cannot read keys from a pipe, so the command must say what
    // it needs rather than wait forever for input that will not come.
    await expect(runCli(["minecraft"])).rejects.toThrow(/needs an operation/i);
  }, 30_000);

  it("minecraft with no operation and --json also refuses to prompt", async () => {
    await expect(runCli(["minecraft", "--json"])).rejects.toThrow(/needs an operation/i);
  }, 30_000);
});
