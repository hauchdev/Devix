import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { bunDetector } from "../../src/detectors/bun.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-bun-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("bunDetector", () => {
  it("declares bun markers", () => {
    expect(bunDetector.id).toBe("bun");
    expect(bunDetector.name).toBe("Bun");
    expect(bunDetector.markers).toEqual(["bun.lockb", "bun.lock", "bunfig.toml"]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await bunDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("is detected when bun.lockb exists", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "bun.lockb"), Buffer.from([0x00, 0x01, 0x02]));

    const result = await bunDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "bun.lockb",
      path: join(dir, "bun.lockb"),
    });
  });

  it("is detected when bun.lock exists", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "bun.lock"), "{}", "utf8");

    const result = await bunDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("bun.lock");
  });

  it("is detected when only bunfig.toml exists", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "bunfig.toml"), "[install]\n", "utf8");

    const result = await bunDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections.map((d) => d.marker)).toEqual(["bunfig.toml"]);
  });

  it("reports every marker present, in declaration order", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "bunfig.toml"), "[install]\n", "utf8");
    await writeFile(join(dir, "bun.lock"), "{}", "utf8");
    await writeFile(join(dir, "bun.lockb"), Buffer.from([0x00]));

    const result = await bunDetector.detect({ root: dir });

    expect(result.detections.map((d) => d.marker)).toEqual([
      "bun.lockb",
      "bun.lock",
      "bunfig.toml",
    ]);
  });
});
