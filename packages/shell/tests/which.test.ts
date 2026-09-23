import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { commandExists, which } from "../src/which.js";

const originalPath = process.env.PATH;
const tempDirs: string[] = [];

afterEach(async () => {
  process.env.PATH = originalPath;
  const { rm } = await import("node:fs/promises");
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-shell-"));
  tempDirs.push(dir);
  return dir;
}

describe("which / commandExists", () => {
  it("resolves node from PATH to an absolute executable", async () => {
    const resolved = await which("node");

    expect(resolved).toBeDefined();
    expect(resolved?.toLowerCase()).toContain("node");
  });

  it("returns undefined for unknown commands and empty strings", async () => {
    expect(await which("definitely-missing-cmd-xyz")).toBeUndefined();
    expect(await which("")).toBeUndefined();
    expect(await commandExists("definitely-missing-cmd-xyz")).toBe(false);
  });

  it("confirms existing tools without spawning anything", async () => {
    expect(await commandExists("node")).toBe(true);
  });

  it("does not resolve relative paths through the current directory", async () => {
    expect(await which("./definitely-not-here")).toBeUndefined();
    expect(await which(join("subdir", "definitely-not-here"))).toBeUndefined();
  });

  it("scans custom PATH directories", async () => {
    const dir = await makeTempDir();
    process.env.PATH = [dir, process.env.PATH].filter(Boolean).join(delimiter);

    if (process.platform === "win32") {
      await writeFile(join(dir, "mytool.cmd"), "@echo off\r\n");
      expect(await which("mytool")).toBe(join(dir, "mytool.cmd"));
    } else {
      await writeFile(join(dir, "mytool"), "#!/bin/sh\n");
      await chmod(join(dir, "mytool"), 0o755);
      expect(await which("mytool")).toBe(join(dir, "mytool"));
    }
  });

  it("ignores non-executable files in PATH (POSIX execute bit)", async () => {
    if (process.platform === "win32") {
      return;
    }
    const dir = await makeTempDir();
    process.env.PATH = [dir, process.env.PATH].filter(Boolean).join(delimiter);

    await writeFile(join(dir, "notexec"), "#!/bin/sh\n");
    await chmod(join(dir, "notexec"), 0o644);

    expect(await which("notexec")).toBeUndefined();
  });
});
