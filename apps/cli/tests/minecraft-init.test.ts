import { describe, expect, it } from "vitest";

import { runCli } from "./helpers/subprocess.js";

describe("devix minecraft init", () => {
  it("without args on a non-interactive stream fails with the usage message", async () => {
    const { mkdtemp, readdir, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-init-eof-"));
    try {
      await expect(runCli(["minecraft", "init", "--here"], dir, "")).rejects.toThrow(
        /init requires a platform and a name/i,
      );
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("normalizes oclif's piped-stdin arg leakage into the missing-args error", async () => {
    // oclif v5 stuffs piped stdin into the first missing positional
    // arg; the command must reject that multi-line "platform" instead
    // of scaffolding from garbage or hanging.
    const { mkdtemp, readdir, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-init-pipe-"));
    try {
      await expect(
        runCli(["minecraft", "init", "--here"], dir, "fabric\nPiped Mod\n"),
      ).rejects.toThrow(/init requires a platform and a name/i);
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("--json refuses to prompt and demands the arguments", async () => {
    await expect(runCli(["minecraft", "init", "--json"])).rejects.toThrow(
      /--json requires the platform/i,
    );
  }, 30_000);

  it("scaffolds a multi-loader fabric+forge project with --mc", async () => {
    const { mkdtemp, readFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-init-multiloader-"));
    try {
      await runCli(
        ["minecraft", "init", "fabric+forge", "DualMod", "--here", "--mc", "1.21.1"],
        dir,
      );

      const fabricBuild = await readFile(join(dir, "fabric/build.gradle"), "utf8");
      expect(fabricBuild).toContain("fabric-loom");
      const shared = await readFile(join(dir, "gradle.properties"), "utf8");
      expect(shared).toContain("minecraft_version=1.21.1");
      expect(shared).toContain("fabric_loader=");
      expect(shared).toContain("forge_version=");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("scaffolds a multi-module paper project with --modules", async () => {
    const { mkdtemp, readFile, readdir, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-init-multimodule-"));
    try {
      const { stdout } = await runCli(
        ["minecraft", "init", "paper", "QueueBoard", "--here", "--modules", "api,core"],
        dir,
      );

      expect(stdout).toMatch(/^\s+Modules\s+main, api, core$/m);
      const settings = await readFile(join(dir, "settings.gradle"), "utf8");
      expect(settings).toContain("include ':api'");
      expect(await readFile(join(dir, "api/build.gradle"), "utf8")).toContain("java-library");
      expect(await readdir(join(dir, "core"))).toContain("src");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("--kind resolves the default platform of the kind", async () => {
    const { mkdtemp, readFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-init-kind-"));
    try {
      const { stdout } = await runCli(
        ["minecraft", "init", "--kind", "proxy-plugin", "Relay", "--here"],
        dir,
      );

      expect(stdout).toMatch(/^\s+Kind\s+proxy-plugin$/m);
      expect(stdout).toMatch(/^\s+Platforms\s+velocity$/m);
      expect(await readFile(join(dir, "build.gradle"), "utf8")).toContain("velocity-api");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("doctor lists the Minecraft section only when platforms are detected", async () => {
    const { mkdtemp, mkdir, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-doctor-mc-"));
    try {
      const plain = await runCli(["doctor"], dir);
      expect(plain.stdout).not.toMatch(/^Minecraft\s/m);

      const resources = join(dir, "src", "main", "resources");
      await mkdir(resources, { recursive: true });
      await writeFile(join(resources, "paper-plugin.yml"), "name: DoctorMc\n", "utf8");

      const withMc = await runCli(["doctor"], dir);
      expect(withMc.stdout).toMatch(/^\s+Minecraft\s+bukkit \(DoctorMc\)$/m);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
