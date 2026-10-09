import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { doctorMinecraft, type MinecraftDoctorServices } from "../src/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-minecraft-doctor-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** A java probe that reports a fixed version, or nothing. */
function java(major: number | undefined): MinecraftDoctorServices {
  return { javaMajorVersion: () => Promise.resolve(major) };
}

/** Writes a minimal Fabric project marker. */
async function makeFabric(dir: string): Promise<void> {
  const resources = join(dir, "src", "main", "resources");
  await mkdir(resources, { recursive: true });
  await writeFile(join(resources, "fabric.mod.json"), "{}", "utf8");
}

/** Writes a complete Gradle wrapper. */
async function writeGradleWrapper(dir: string): Promise<void> {
  await writeFile(join(dir, "gradlew"), "#!/bin/sh\n", "utf8");
  await writeFile(join(dir, "gradlew.bat"), "@echo off\n", "utf8");
  const wrapperDir = join(dir, "gradle", "wrapper");
  await mkdir(wrapperDir, { recursive: true });
  await writeFile(join(wrapperDir, "gradle-wrapper.jar"), "", "utf8");
}

/** Looks one check up by id. */
function check(report: Awaited<ReturnType<typeof doctorMinecraft>>, id: string) {
  return report.checks.find((entry) => entry.id === id);
}

describe("doctorMinecraft", () => {
  it("reports a directory that is not a Minecraft project", async () => {
    const dir = await makeTempDir();

    const report = await doctorMinecraft(dir, java(21));

    expect(report.isMinecraft).toBe(false);
    expect(report.platforms).toEqual([]);
    expect(check(report, "project")?.status).toBe("missing");
  });

  it("passes a complete fabric project", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);
    await writeGradleWrapper(dir);
    await writeFile(join(dir, "gradle.properties"), "minecraft_version=1.21.1\n", "utf8");

    const report = await doctorMinecraft(dir, java(21));

    expect(report.isMinecraft).toBe(true);
    expect(report.platforms).toContain("fabric");
    expect(report.buildSystem).toBe("gradle");
    expect(check(report, "wrapper")?.status).toBe("ok");
    expect(check(report, "wrapper-jar")?.status).toBe("ok");
    expect(check(report, "java")?.status).toBe("ok");
    expect(check(report, "version")?.status).toBe("ok");
  });

  it("warns when the build wrapper is missing", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);

    const report = await doctorMinecraft(dir, java(21));

    const wrapper = check(report, "wrapper");
    expect(wrapper?.status).toBe("warn");
    expect(wrapper?.hint).toContain("gradle wrapper");
  });

  it("warns when only the wrapper jar is missing", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);
    await writeFile(join(dir, "gradlew"), "#!/bin/sh\n", "utf8");

    const report = await doctorMinecraft(dir, java(21));

    expect(check(report, "wrapper")?.status).toBe("ok");
    expect(check(report, "wrapper-jar")?.status).toBe("warn");
  });

  it("warns when Java is older than the target needs", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);
    await writeFile(join(dir, "gradle.properties"), "minecraft_version=26.3\n", "utf8");

    const report = await doctorMinecraft(dir, java(8));

    const javaCheck = check(report, "java");
    expect(javaCheck?.status).toBe("warn");
    expect(javaCheck?.hint).toContain("Java 21");
  });

  it("warns when Java is not installed at all", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);

    const report = await doctorMinecraft(dir, java(undefined));

    expect(check(report, "java")?.status).toBe("warn");
    expect(check(report, "java")?.hint).toContain("not found");
  });

  it("warns when the declared Minecraft version is not in the catalog", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);
    await writeFile(join(dir, "gradle.properties"), "minecraft_version=0.0-nonexistent\n", "utf8");

    const report = await doctorMinecraft(dir, java(21));

    expect(check(report, "version")?.status).toBe("warn");
    expect(check(report, "version")?.detail).toBe("0.0-nonexistent");
  });

  it("does not claim a version check when none is declared", async () => {
    const dir = await makeTempDir();
    await makeFabric(dir);

    const report = await doctorMinecraft(dir, java(21));

    expect(check(report, "version")).toBeUndefined();
  });

  it("infers maven for a spigot project", async () => {
    const dir = await makeTempDir();
    const resources = join(dir, "src", "main", "resources");
    await mkdir(resources, { recursive: true });
    await writeFile(join(resources, "plugin.yml"), "name: Test\n", "utf8");

    const report = await doctorMinecraft(dir, java(17));

    expect(report.buildSystem).toBe("maven");
    // A Maven project has no Gradle wrapper jar check.
    expect(check(report, "wrapper-jar")).toBeUndefined();
  });
});
