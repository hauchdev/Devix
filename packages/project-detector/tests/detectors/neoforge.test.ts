import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { neoforgeDetector } from "../../src/detectors/neoforge.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-neoforge-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("neoforgeDetector", () => {
  it("declares the neoforge markers", () => {
    expect(neoforgeDetector.id).toBe("neoforge");
    expect(neoforgeDetector.name).toBe("NeoForge");
    expect(neoforgeDetector.category).toBe("minecraft");
    expect(neoforgeDetector.markers).toEqual([
      "src/main/resources/META-INF/neoforge.mods.toml",
      "META-INF/neoforge.mods.toml",
    ]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await neoforgeDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("detects neoforge.mods.toml with the modId detail", async () => {
    const dir = await makeTempDir();
    const meta = join(dir, "src", "main", "resources", "META-INF");
    await mkdir(meta, { recursive: true });
    await writeFile(
      join(meta, "neoforge.mods.toml"),
      'modLoader="javafml"\n[[mods]]\nmodId="neomod"\n',
      "utf8",
    );

    const result = await neoforgeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "src/main/resources/META-INF/neoforge.mods.toml",
      detail: "neomod",
    });
  });

  it("counts a malformed manifest as detected without detail", async () => {
    const dir = await makeTempDir();
    const meta = join(dir, "src", "main", "resources", "META-INF");
    await mkdir(meta, { recursive: true });
    await writeFile(join(meta, "neoforge.mods.toml"), "not toml ]]", "utf8");

    const result = await neoforgeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBeUndefined();
  });
});
