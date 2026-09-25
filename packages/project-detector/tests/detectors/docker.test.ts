import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { dockerDetector } from "../../src/detectors/docker.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-docker-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("dockerDetector", () => {
  it("declares docker markers in declaration order", () => {
    expect(dockerDetector.id).toBe("docker");
    expect(dockerDetector.name).toBe("Docker");
    expect(dockerDetector.markers).toEqual([
      "Dockerfile",
      "Dockerfile.dev",
      "Dockerfile.prod",
      "docker-compose.yml",
      "docker-compose.yaml",
      "docker-compose.dev.yml",
      "docker-compose.prod.yml",
      "compose.yml",
      "compose.yaml",
      "compose.dev.yml",
      "compose.prod.yml",
      ".dockerignore",
    ]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await dockerDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("is detected when a Dockerfile exists", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "Dockerfile"), "FROM node:22-alpine\n", "utf8");

    const result = await dockerDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "Dockerfile",
      path: join(dir, "Dockerfile"),
    });
  });

  it("is detected with a lowercase compose file", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "compose.yaml"), "services: {}\n", "utf8");

    const result = await dockerDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("compose.yaml");
  });

  it("is detected with a .dockerignore only", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, ".dockerignore"), "node_modules\n", "utf8");

    const result = await dockerDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe(".dockerignore");
  });

  it("reports every marker present, in declaration order", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, ".dockerignore"), "node_modules\n", "utf8");
    await writeFile(join(dir, "compose.yml"), "services: {}\n", "utf8");
    await writeFile(join(dir, "Dockerfile.dev"), "FROM node:22-alpine\n", "utf8");
    await writeFile(join(dir, "Dockerfile"), "FROM node:22-alpine\n", "utf8");

    const result = await dockerDetector.detect({ root: dir });

    expect(result.detections.map((d) => d.marker)).toEqual([
      "Dockerfile",
      "Dockerfile.dev",
      "compose.yml",
      ".dockerignore",
    ]);
  });
});
