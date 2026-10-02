import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { planRun } from "../src/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-minecraft-run-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("planRun", () => {
  it("reports no command when the directory is not a Minecraft project", async () => {
    const dir = await makeTempDir();

    const plan = await planRun(dir);

    expect(plan.isMinecraft).toBe(false);
    expect(plan.command).toBe("");
    expect(plan.warnings.length).toBeGreaterThan(0);
  });

  it("suggests runClient for a fabric project", async () => {
    const dir = await makeTempDir();
    const resources = join(dir, "src", "main", "resources");
    await mkdir(resources, { recursive: true });
    await writeFile(join(resources, "fabric.mod.json"), "{}", "utf8");

    const plan = await planRun(dir);

    expect(plan.isMinecraft).toBe(true);
    expect(plan.platforms).toContain("fabric");
    expect(plan.command).toBe("gradle runClient");
    expect(plan.warnings.some((w) => w.includes("wrapper"))).toBe(true);
  });

  it("uses the wrapper scripts when present", async () => {
    const dir = await makeTempDir();
    const resources = join(dir, "src", "main", "resources");
    await mkdir(resources, { recursive: true });
    await writeFile(join(resources, "fabric.mod.json"), "{}", "utf8");
    await writeFile(join(dir, "gradlew"), "#!/bin/sh\n", "utf8");
    await writeFile(join(dir, "gradlew.bat"), "@echo off\n", "utf8");
    const wrapperDir = join(dir, "gradle", "wrapper");
    await mkdir(wrapperDir, { recursive: true });
    await writeFile(join(wrapperDir, "gradle-wrapper.jar"), "", "utf8");

    const plan = await planRun(dir);

    expect(plan.command).toBe("./gradlew runClient");
    expect(plan.windowsCommand).toBe(".\\gradlew.bat runClient");
    expect(plan.warnings.some((w) => w.includes("wrapper"))).toBe(false);
  });

  it("suggests runServer for paper projects", async () => {
    const dir = await makeTempDir();
    const resources = join(dir, "src", "main", "resources");
    await mkdir(resources, { recursive: true });
    await writeFile(join(resources, "plugin.yml"), "name: Test\n", "utf8");

    const plan = await planRun(dir);

    expect(plan.platforms).toContain("bukkit");
    expect(plan.command).toContain("runServer");
  });

  it("falls back to build for proxy plugins", async () => {
    const dir = await makeTempDir();
    const resources = join(dir, "src", "main", "resources");
    await mkdir(resources, { recursive: true });
    await writeFile(join(resources, "velocity-plugin.json"), "{}", "utf8");

    const plan = await planRun(dir);

    expect(plan.platforms).toContain("velocity");
    expect(plan.command).toContain("build");
  });
});
