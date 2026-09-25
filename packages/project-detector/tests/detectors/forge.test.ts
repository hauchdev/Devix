import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { forgeDetector } from "../../src/detectors/forge.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-forge-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("forgeDetector", () => {
  it("declares the forge markers", () => {
    expect(forgeDetector.id).toBe("forge");
    expect(forgeDetector.name).toBe("Forge");
    expect(forgeDetector.category).toBe("minecraft");
    expect(forgeDetector.markers).toEqual([
      "src/main/resources/META-INF/mods.toml",
      "src/main/resources/META-INF/neoforge.mods.toml",
      "META-INF/mods.toml",
      "META-INF/neoforge.mods.toml",
    ]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await forgeDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("detects src/main/resources/META-INF/mods.toml with the modId detail", async () => {
    const dir = await makeTempDir();
    const meta = join(dir, "src", "main", "resources", "META-INF");
    await mkdir(meta, { recursive: true });
    await writeFile(
      join(meta, "mods.toml"),
      'modLoader="javafml"\nloaderVersion="[47,)"\n[[mods]]\nmodId="mymod"\nversion="1.0.0"\n',
      "utf8",
    );

    const result = await forgeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "src/main/resources/META-INF/mods.toml",
      detail: "mymod",
    });
  });

  it("detects a flat META-INF/mods.toml (extracted layout)", async () => {
    const dir = await makeTempDir();
    const meta = join(dir, "META-INF");
    await mkdir(meta, { recursive: true });
    await writeFile(join(meta, "mods.toml"), '[[mods]]\nmodId="flatmod"\n', "utf8");

    const result = await forgeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({ marker: "META-INF/mods.toml", detail: "flatmod" });
  });

  it("counts a malformed mods.toml as detected without detail", async () => {
    const dir = await makeTempDir();
    const meta = join(dir, "src", "main", "resources", "META-INF");
    await mkdir(meta, { recursive: true });
    await writeFile(join(meta, "mods.toml"), "??? broken toml", "utf8");

    const result = await forgeDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.detail).toBeUndefined();
  });
});
