import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { Cache } from "../src/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-cache-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    const { rm } = await import("node:fs/promises");
    await rm(dir, { recursive: true, force: true });
  }
});

describe("Cache", () => {
  it("stores and retrieves values", async () => {
    const dir = await makeTempDir();
    const cache = new Cache({ directory: dir });

    await cache.set("pnpm:version", { version: "9.0.0" });
    const value = await cache.get("pnpm:version");

    expect(value).toEqual({ version: "9.0.0" });
  });

  it("returns undefined for missing keys", async () => {
    const dir = await makeTempDir();
    const cache = new Cache({ directory: dir });

    expect(await cache.get("missing")).toBeUndefined();
  });

  it("expires entries after the TTL", async () => {
    const dir = await makeTempDir();
    const cache = new Cache({ directory: dir });

    await cache.set("stale", "value", 1);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(await cache.get("stale")).toBeUndefined();
  });

  it("keeps entries without TTL indefinitely", async () => {
    const dir = await makeTempDir();
    const cache = new Cache({ directory: dir });

    await cache.set("forever", "value");
    expect(await cache.get("forever")).toBe("value");
  });

  it("deletes entries", async () => {
    const dir = await makeTempDir();
    const cache = new Cache({ directory: dir });

    await cache.set("gone", "value");
    await cache.delete("gone");
    expect(await cache.get("gone")).toBeUndefined();
  });

  it("clears the whole cache", async () => {
    const dir = await makeTempDir();
    const cache = new Cache({ directory: dir });

    await cache.set("a", 1);
    await cache.set("b", 2);
    await cache.clear();
    expect(await cache.get("a")).toBeUndefined();
    expect(await cache.get("b")).toBeUndefined();
  });

  it("rejects relative cache directories", () => {
    expect(() => new Cache({ directory: "relative" })).toThrow();
  });
});
