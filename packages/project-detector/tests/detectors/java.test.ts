import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { javaDetector } from "../../src/detectors/java.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-java-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("javaDetector", () => {
  it("declares maven and gradle markers", () => {
    expect(javaDetector.id).toBe("java");
    expect(javaDetector.name).toBe("Java");
    expect(javaDetector.markers).toEqual([
      "pom.xml",
      "build.gradle",
      "build.gradle.kts",
      "settings.gradle",
      "settings.gradle.kts",
      "gradlew",
    ]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await javaDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("is detected via pom.xml with the artifactId as detail", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "pom.xml"),
      "<project><artifactId>my-app</artifactId></project>",
      "utf8",
    );

    const result = await javaDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "pom.xml",
      path: join(dir, "pom.xml"),
      detail: "my-app",
    });
  });

  it("counts a malformed pom.xml as detected (no detail)", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pom.xml"), "not xml at all", "utf8");

    const result = await javaDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("pom.xml");
    expect(result.detections[0]?.detail).toBeUndefined();
  });

  it("is detected via build.gradle.kts without detail", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "build.gradle.kts"), "plugins { java }\n", "utf8");

    const result = await javaDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "build.gradle.kts",
      path: join(dir, "build.gradle.kts"),
    });
  });

  it("is detected via settings.gradle.kts with rootProject.name detail", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "settings.gradle.kts"),
      'rootProject.name = "my-kotlin-app"\n',
      "utf8",
    );

    const result = await javaDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "settings.gradle.kts",
      detail: "my-kotlin-app",
    });
  });

  it("is detected via the gradle wrapper", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "gradlew"), "#!/bin/sh\n", "utf8");

    const result = await javaDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("gradlew");
  });

  it("reports both maven and gradle markers when both exist", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "pom.xml"),
      "<project><artifactId>legacy</artifactId></project>",
      "utf8",
    );
    await writeFile(join(dir, "build.gradle"), "plugins { id 'java' }\n", "utf8");

    const result = await javaDetector.detect({ root: dir });

    expect(result.detections.map((d) => d.marker)).toEqual(["pom.xml", "build.gradle"]);
  });
});
