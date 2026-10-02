import { describe, expect, it } from "vitest";

import { runCli } from "./helpers/subprocess.js";

describe("devix config", () => {
  it("path prints the default config location", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-config-path-"));
    try {
      const { stdout } = await runCli(["config", "path"], dir);

      expect(stdout.trim()).toBe(join(dir, "devix.config.json"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("set writes a value that get and list read back", async () => {
    const { mkdtemp, readFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-config-set-"));
    try {
      await runCli(["config", "set", "name", "demo-project"], dir);
      await runCli(["config", "set", "features.doctor", "false"], dir);

      const written = JSON.parse(await readFile(join(dir, "devix.config.json"), "utf8")) as {
        name: string;
        features: { doctor: boolean };
      };
      expect(written).toEqual({ name: "demo-project", features: { doctor: false } });

      const got = await runCli(["config", "get", "features.doctor"], dir);
      expect(got.stdout.trim()).toBe("false");

      const listed = await runCli(["config", "list", "--json"], dir);
      const parsed = JSON.parse(listed.stdout) as {
        config: Record<string, unknown>;
      };
      expect(parsed.config).toEqual({ name: "demo-project", "features.doctor": false });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("rejects unknown keys and missing arguments", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-config-bad-"));
    try {
      await expect(runCli(["config", "get"], dir)).rejects.toThrow(/get requires a key/i);
      await expect(runCli(["config", "get", "nope"], dir)).rejects.toThrow(/Unknown config key/i);
      await expect(runCli(["config", "set", "nope", "1"], dir)).rejects.toThrow(/unknown key/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
