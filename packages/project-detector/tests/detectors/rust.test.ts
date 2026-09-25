import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { rustDetector } from "../../src/detectors/rust.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-rust-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("rustDetector", () => {
  it("declares cargo markers", () => {
    expect(rustDetector.id).toBe("rust");
    expect(rustDetector.name).toBe("Rust");
    expect(rustDetector.markers).toEqual(["Cargo.toml", "Cargo.lock"]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await rustDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("is detected via Cargo.toml with package name and edition details", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "Cargo.toml"),
      '[package]\nname = "my-crate"\nversion = "0.1.0"\nedition = "2021"\n',
      "utf8",
    );

    const result = await rustDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    const byMarker = new Map(result.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("Cargo.toml")).toBe("my-crate");
    expect(byMarker.get("Cargo.toml#edition")).toBe("2021");
  });

  it("does not read fields from sections after [package]", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "Cargo.toml"),
      '[dependencies]\nserde = "1"\n\n[package]\nname = "my-crate"\n',
      "utf8",
    );

    const result = await rustDetector.detect({ root: dir });

    const byMarker = new Map(result.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("Cargo.toml")).toBe("my-crate");
  });

  it("counts a manifest without [package] as detected (no detail)", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "Cargo.toml"), '[workspace]\nmembers = ["crates/*"]\n', "utf8");

    const result = await rustDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    const byMarker = new Map(result.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("Cargo.toml")).toBeUndefined();
  });

  it("counts a malformed manifest as detected (no detail)", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "Cargo.toml"), "\x00 not toml", "utf8");

    const result = await rustDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("Cargo.toml");
    expect(result.detections[0]?.detail).toBeUndefined();
  });

  it("is detected via Cargo.lock only", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "Cargo.lock"), "version = 4\n", "utf8");

    const result = await rustDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections.map((d) => d.marker)).toEqual(["Cargo.lock"]);
  });

  it("reports both markers when both exist", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "Cargo.toml"), '[package]\nname = "x"\n', "utf8");
    await writeFile(join(dir, "Cargo.lock"), "version = 4\n", "utf8");

    const result = await rustDetector.detect({ root: dir });

    const markers = result.detections.map((d) => d.marker);
    expect(markers[0]).toBe("Cargo.toml");
    expect(markers[markers.length - 1]).toBe("Cargo.lock");
  });
});
