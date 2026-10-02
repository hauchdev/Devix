import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createDefaultRegistry,
  detectWeb,
  DetectorRegistry,
  isStaticWebFramework,
  WEB_FRAMEWORK_IDS,
  webFrameworkIdForMarker,
  webDetector,
} from "../src/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-web-"));
  tempDirs.push(dir);
  return dir;
}

async function writePackageJson(dir: string, value: unknown): Promise<void> {
  await mkdir(dir, { recursive: true });
  const content = typeof value === "string" ? value : JSON.stringify(value);
  await writeFile(join(dir, "package.json"), content, "utf8");
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("webDetector", () => {
  it("is not detected without a package.json", async () => {
    const dir = await makeTempDir();

    expect(await webDetector.detect({ root: dir })).toEqual({
      detected: false,
      detections: [],
    });
  });

  it("detects Next.js from dependencies", async () => {
    const dir = await makeTempDir();
    await writePackageJson(dir, { name: "app", dependencies: { next: "15.0.0", react: "19.0.0" } });

    const result = await webDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections).toHaveLength(1);
    expect(result.detections[0]?.marker).toBe("package.json#next");
    expect(result.detections[0]?.detail).toBe("Next.js");
  });

  it("detects frameworks from devDependencies too", async () => {
    const dir = await makeTempDir();
    await writePackageJson(dir, { name: "app", devDependencies: { vite: "6.0.0" } });

    const result = await webDetector.detect({ root: dir });

    expect(result.detections[0]?.detail).toBe("Vite");
  });

  it("detects several frameworks in declaration order", async () => {
    const dir = await makeTempDir();
    await writePackageJson(dir, {
      dependencies: { vite: "6.0.0", astro: "5.0.0" },
    });

    const result = await webDetector.detect({ root: dir });

    expect(result.detections.map((d) => d.detail)).toEqual(["Astro", "Vite"]);
  });

  it("recognizes the modern Nuxt and SvelteKit package names", async () => {
    const dir = await makeTempDir();
    await writePackageJson(dir, {
      dependencies: { nuxt4: "4.0.0", "@sveltejs/kit": "2.0.0" },
    });

    const result = await webDetector.detect({ root: dir });

    expect(result.detections.map((d) => d.detail)).toEqual(["Nuxt", "SvelteKit"]);
  });

  it("is not detected when no web dependency is present", async () => {
    const dir = await makeTempDir();
    await writePackageJson(dir, { name: "app", dependencies: { lodash: "4.0.0" } });

    expect(await webDetector.detect({ root: dir })).toEqual({
      detected: false,
      detections: [],
    });
  });

  it("treats a malformed package.json as detected without details", async () => {
    const dir = await makeTempDir();
    await writePackageJson(dir, "{ not json");

    const result = await webDetector.detect({ root: dir });

    expect(result.detected).toBe(true);
    expect(result.detections).toEqual([
      { marker: "package.json", path: join(dir, "package.json") },
    ]);
  });

  it("ignores dependency sections that are not objects", async () => {
    const dir = await makeTempDir();
    await writePackageJson(dir, { dependencies: "next", devDependencies: null });

    expect((await webDetector.detect({ root: dir })).detected).toBe(false);
  });
});

describe("detectWeb", () => {
  it("composes frameworks from the default registry", async () => {
    const dir = await makeTempDir();
    await writePackageJson(dir, { dependencies: { next: "15.0.0", vite: "6.0.0" } });

    const detection = await detectWeb(createDefaultRegistry(), { root: dir });

    expect(detection.isWeb).toBe(true);
    expect(detection.frameworks.map((f) => f.id)).toEqual(["next", "vite"]);
    expect(detection.frameworks[0]?.package).toBe("next");
    expect(detection.frameworks[0]?.path).toBe(join(dir, "package.json"));
  });

  it("returns isWeb false for a non-web project", async () => {
    const dir = await makeTempDir();
    await writePackageJson(dir, { dependencies: { lodash: "4.0.0" } });

    const detection = await detectWeb(createDefaultRegistry(), { root: dir });

    expect(detection.isWeb).toBe(false);
    expect(detection.frameworks).toEqual([]);
  });

  it("returns isWeb false when the registry has no web detector", async () => {
    const dir = await makeTempDir();
    await writePackageJson(dir, { dependencies: { next: "15.0.0" } });
    const empty = createDefaultRegistry();
    // A registry without the web detector must degrade, not throw.
    const withoutWeb = withoutDetector(empty, "web");

    const detection = await detectWeb(withoutWeb, { root: dir });

    expect(detection.isWeb).toBe(false);
  });
});

/** Builds a registry that excludes one built-in detector. */
function withoutDetector(full: DetectorRegistry, excluded: string): DetectorRegistry {
  return new DetectorRegistry().registerAll(
    full.all().filter((detector) => detector.id !== excluded),
  );
}

describe("web framework metadata", () => {
  it("exposes the framework ids in a stable order", () => {
    expect(WEB_FRAMEWORK_IDS).toContain("next");
    expect(WEB_FRAMEWORK_IDS).toContain("astro");
    expect(WEB_FRAMEWORK_IDS.indexOf("next")).toBeLessThan(WEB_FRAMEWORK_IDS.indexOf("vite"));
  });

  it("classifies the static-output frameworks", () => {
    expect(isStaticWebFramework("astro")).toBe(true);
    expect(isStaticWebFramework("eleventy")).toBe(true);
    expect(isStaticWebFramework("next")).toBe(false);
    expect(isStaticWebFramework("vite")).toBe(false);
  });

  it("resolves ids from evidence markers and rejects unknown ones", () => {
    expect(webFrameworkIdForMarker("package.json#next")).toBe("next");
    expect(webFrameworkIdForMarker("package.json#@sveltejs/kit")).toBe("sveltekit");
    expect(webFrameworkIdForMarker("package.json#unknown-pkg")).toBeUndefined();
    expect(webFrameworkIdForMarker("package.json")).toBeUndefined();
    expect(webFrameworkIdForMarker("src/index.html")).toBeUndefined();
  });
});
