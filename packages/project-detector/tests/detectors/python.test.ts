import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { pythonDetector } from "../../src/detectors/python.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-python-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("pythonDetector", () => {
  it("declares python markers", () => {
    expect(pythonDetector.id).toBe("python");
    expect(pythonDetector.name).toBe("Python");
    expect(pythonDetector.markers).toEqual([
      "pyproject.toml",
      "requirements.txt",
      "requirements-dev.txt",
      "requirements_dev.txt",
      "setup.py",
      "setup.cfg",
      "Pipfile",
      "Pipfile.lock",
      "poetry.lock",
      "uv.lock",
    ]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await pythonDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("is detected via pyproject.toml with the project name as detail", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "pyproject.toml"),
      '[project]\nname = "my-app"\nversion = "0.1.0"\n',
      "utf8",
    );

    const result = await pythonDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "pyproject.toml",
      path: join(dir, "pyproject.toml"),
      detail: "my-app",
    });
  });

  it("counts a pyproject without [project] as detected (no detail)", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pyproject.toml"), "[tool.black]\nline-length = 100\n", "utf8");

    const result = await pythonDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBeUndefined();
  });

  it("counts a malformed pyproject as detected (no detail)", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pyproject.toml"), "\x00 not toml", "utf8");

    const result = await pythonDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("pyproject.toml");
    expect(result.detections[0]?.detail).toBeUndefined();
  });

  it("is detected via requirements.txt only", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "requirements.txt"), "requests>=2\n", "utf8");

    const result = await pythonDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("requirements.txt");
  });

  it("is detected via a legacy setup.py", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "setup.py"), "from setuptools import setup\nsetup()\n", "utf8");

    const result = await pythonDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("setup.py");
  });

  it("is detected via a uv.lock", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "uv.lock"), "version = 1\n", "utf8");

    const result = await pythonDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("uv.lock");
  });

  it("reports every marker present, in declaration order", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "requirements.txt"), "requests>=2\n", "utf8");
    await writeFile(join(dir, "setup.py"), "from setuptools import setup\nsetup()\n", "utf8");
    await writeFile(join(dir, "pyproject.toml"), '[project]\nname = "my-app"\n', "utf8");

    const result = await pythonDetector.detect({ root: dir });

    expect(result.detections.map((d) => d.marker)).toEqual([
      "pyproject.toml",
      "requirements.txt",
      "setup.py",
    ]);
  });
});
