import { Cache } from "@devix-cli/cache";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { withCachedTools } from "../src/index.js";
import type { DoctorServices } from "../src/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-doctor-cache-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function countingServices(version: string | undefined): {
  services: DoctorServices;
  calls: () => number;
} {
  let calls = 0;
  return {
    services: {
      async getToolVersion(): Promise<string | undefined> {
        calls += 1;
        return version;
      },
    },
    calls: () => calls,
  };
}

describe("withCachedTools", () => {
  it("probes once and serves the second call from cache", async () => {
    const dir = await makeTempDir();
    const inner = countingServices("1.2.3");
    const services = withCachedTools(inner.services, {
      cache: new Cache({ directory: dir }),
      ttlMs: 60_000,
    });

    expect(await services.getToolVersion("node", "--version")).toBe("1.2.3");
    expect(await services.getToolVersion("node", "--version")).toBe("1.2.3");
    expect(inner.calls()).toBe(1);
  });

  it("does not cache missing tools", async () => {
    const dir = await makeTempDir();
    const inner = countingServices(undefined);
    const services = withCachedTools(inner.services, {
      cache: new Cache({ directory: dir }),
      ttlMs: 60_000,
    });

    expect(await services.getToolVersion("bun", "--version")).toBeUndefined();
    expect(await services.getToolVersion("bun", "--version")).toBeUndefined();
    expect(inner.calls()).toBe(2);
  });

  it("keys the cache by tool and version argument", async () => {
    const dir = await makeTempDir();
    const inner = countingServices("9.9.9");
    const services = withCachedTools(inner.services, {
      cache: new Cache({ directory: dir }),
      ttlMs: 60_000,
    });

    await services.getToolVersion("node", "--version");
    await services.getToolVersion("git", "-v");

    expect(inner.calls()).toBe(2);
  });

  it("re-probes once the TTL expires", async () => {
    const dir = await makeTempDir();
    const inner = countingServices("1.2.3");
    const services = withCachedTools(inner.services, {
      cache: new Cache({ directory: dir }),
      ttlMs: 1,
    });

    await services.getToolVersion("node", "--version");
    await new Promise((resolve) => setTimeout(resolve, 10));
    await services.getToolVersion("node", "--version");

    expect(inner.calls()).toBe(2);
  });

  it("falls back to the real probe when the cache is unusable", async () => {
    const dir = await makeTempDir();
    const blocker = join(dir, "blocker");
    await writeFile(blocker, "not a directory", "utf8");

    const inner = countingServices("1.2.3");
    // A cache directory that cannot be created must not break the probe.
    const services = withCachedTools(inner.services, {
      cache: new Cache({ directory: join(blocker, "cache") }),
    });

    expect(await services.getToolVersion("node", "--version")).toBe("1.2.3");
    expect(inner.calls()).toBe(1);
  });
});
