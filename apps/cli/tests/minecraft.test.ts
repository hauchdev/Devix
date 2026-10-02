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
});
