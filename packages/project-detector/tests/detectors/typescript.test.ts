import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { typescriptDetector } from "../../src/detectors/typescript.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-ts-detector-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("typescriptDetector", () => {
  it("declares tsconfig.json as its marker", () => {
    expect(typescriptDetector.id).toBe("typescript");
    expect(typescriptDetector.name).toBe("TypeScript");
    expect(typescriptDetector.markers).toEqual(["tsconfig.json"]);
  });

  it("is not detected in an empty directory", async () => {
    const dir = await makeTempDir();

    const result = await typescriptDetector.detect({ root: dir });

    expect(result).toEqual({ detected: false, detections: [] });
  });

  it("is detected when tsconfig.json exists", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "tsconfig.json"), "{}", "utf8");

    const result = await typescriptDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]).toMatchObject({
      marker: "tsconfig.json",
      path: join(dir, "tsconfig.json"),
    });
  });

  it("extracts compilerOptions.target as a detail", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { target: "ES2022" } }),
      "utf8",
    );

    const result = await typescriptDetector.detect({ root: dir });

    const byMarker = new Map(result.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("tsconfig.json#target")).toBe("ES2022");
  });

  it("parses JSONC configs with comments and trailing content", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "tsconfig.json"),
      [
        "{",
        "  // line comment",
        "  /* block comment */",
        '  "compilerOptions": {',
        '    "target": "ES2022", // trailing comment',
        '    "paths": { "fix": "fix/* /* tricky */" },',
        "  },",
        "}",
      ].join("\n"),
      "utf8",
    );

    const result = await typescriptDetector.detect({ root: dir });

    const byMarker = new Map(result.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("tsconfig.json#target")).toBe("ES2022");
  });

  it("counts a malformed tsconfig as detected (no detail)", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "tsconfig.json"), "{ not json ]", "utf8");

    const result = await typescriptDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections[0]?.marker).toBe("tsconfig.json");
    expect(result.detections).toHaveLength(1);
  });

  it("extracts the typescript version from package.json", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "tsconfig.json"), "{}", "utf8");
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ devDependencies: { typescript: "^6.0.3" } }),
      "utf8",
    );

    const result = await typescriptDetector.detect({ root: dir });

    const byMarker = new Map(result.detections.map((d) => [d.marker, d.detail]));
    expect(byMarker.get("package.json#typescript")).toBe("^6.0.3");
  });

  it("does not report a typescript version when package.json has none", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "tsconfig.json"), "{}", "utf8");
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "x" }), "utf8");

    const result = await typescriptDetector.detect({ root: dir });

    expect(result.detections.map((d) => d.marker)).not.toContain("package.json#typescript");
  });
});
