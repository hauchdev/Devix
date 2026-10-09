import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { planBuild, planClean } from "../src/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-minecraft-build-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** Writes a minimal Fabric project marker. */
async function makeFabric(dir: string): Promise<void> {
  const resources = join(dir, "src", "main", "resources");
  await mkdir(resources, { recursive: true });
  await writeFile(join(resources, "fabric.mod.json"), "{}", "utf8");
}

describe("planBuild", () => {
  it("reports no command outside a Minecraft project", async () => {
    const dir = await makeTempDir();

    const plan = await planBuild(dir);

    expect(plan.isMinecraft).toBe(false);
    expect(plan.command).toBe("");
    expect(plan.warnings.length).toBeGreaterThan(0);
  });

  it("builds with the installed Gradle when there is no wrapper", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);

    const plan = await planBuild(dir);

    expect(plan.isMinecraft).toBe(true);
    expect(plan.command).toBe("gradle build");
    expect(plan.warnings.some((warning) => warning.includes("wrapper"))).toBe(true);
  });

  it("builds with the wrapper when it is present", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);
    await writeFile(join(dir, "gradlew"), "#!/bin/sh\n", "utf8");
    await writeFile(join(dir, "gradlew.bat"), "@echo off\n", "utf8");
    const wrapperDir = join(dir, "gradle", "wrapper");
    await mkdir(wrapperDir, { recursive: true });
    await writeFile(join(wrapperDir, "gradle-wrapper.jar"), "", "utf8");

    const plan = await planBuild(dir);

    expect(plan.command).toBe("./gradlew build");
    expect(plan.windowsCommand).toBe(".\\gradlew.bat build");
    expect(plan.warnings).toEqual([]);
  });

  it("always uses the build task, never a run task", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);

    const plan = await planBuild(dir);

    // runClient is for `minecraft run`; building must not launch the game.
    expect(plan.command).not.toContain("runClient");
    expect(plan.command).toContain("build");
  });

  it("lists the detected platforms", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);

    const plan = await planBuild(dir);

    expect(plan.platforms).toContain("fabric");
  });
});

describe("planClean", () => {
  it("cleans with the wrapper when it is present", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);
    await writeFile(join(dir, "gradlew"), "#!/bin/sh\n", "utf8");
    const wrapperDir = join(dir, "gradle", "wrapper");
    await mkdir(wrapperDir, { recursive: true });
    await writeFile(join(wrapperDir, "gradle-wrapper.jar"), "", "utf8");

    const plan = await planClean(dir);

    expect(plan.command).toBe("./gradlew clean");
  });

  it("uses the clean task, never build or run", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);

    const plan = await planClean(dir);

    expect(plan.command).toBe("gradle clean");
    expect(plan.command).not.toContain("build");
  });

  it("reports no command outside a Minecraft project", async () => {
    const dir = await makeTempDir();

    const plan = await planClean(dir);

    expect(plan.isMinecraft).toBe(false);
    expect(plan.command).toBe("");
  });
});
