import { describe, expect, it } from "vitest";

import { runCli } from "./helpers/subprocess.js";

describe("devix web", () => {
  it("detect reports no framework outside web projects", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-empty-"));
    try {
      const { stdout } = await runCli(["web", "detect", "--json"], dir);

      const parsed = JSON.parse(stdout) as { isWeb: boolean; frameworks: unknown[] };
      expect(parsed.isWeb).toBe(false);
      expect(parsed.frameworks).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("detect lists the framework of a Next.js project", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-next-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ name: "app", dependencies: { next: "15.0.0" } }),
        "utf8",
      );

      const { stdout } = await runCli(["web", "detect"], dir);
      expect(stdout).toMatch(/Frameworks \(\d+\)/);
      expect(stdout).toContain("Next.js");
      expect(stdout).toContain("dynamic");

      const asJson = await runCli(["web", "detect", "--json"], dir);
      const parsed = JSON.parse(asJson.stdout) as {
        isWeb: boolean;
        frameworks: { id: string; static: boolean }[];
      };
      expect(parsed.isWeb).toBe(true);
      expect(parsed.frameworks[0]?.id).toBe("next");
      expect(parsed.frameworks[0]?.static).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("env lists variable names without their values", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-env-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { next: "15.0.0" } }),
        "utf8",
      );
      await writeFile(join(dir, ".env"), "API_TOKEN=super-secret-value\n", "utf8");

      const { stdout } = await runCli(["web", "env"], dir);

      expect(stdout).toContain("API_TOKEN");
      expect(stdout).not.toContain("super-secret-value");
      expect(stdout).toContain("only variable names");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("scripts lists the declared scripts", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-scripts-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({
          dependencies: { next: "15.0.0" },
          scripts: { dev: "next dev", build: "next build" },
        }),
        "utf8",
      );

      const { stdout } = await runCli(["web", "scripts"], dir);

      expect(stdout).toContain("dev");
      expect(stdout).toContain("next dev");
      expect(stdout).toContain("build");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("build prints the command without executing it", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-build-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { next: "15.0.0" }, scripts: { build: "next build" } }),
        "utf8",
      );

      const { stdout } = await runCli(["web", "build"], dir);

      expect(stdout).toContain("npm run build");
      expect(stdout).toContain("print-first");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("serve reports a missing build and a detected one", async () => {
    const { mkdir, mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-serve-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { astro: "5.0.0" }, scripts: { build: "astro build" } }),
        "utf8",
      );

      await expect(runCli(["web", "serve"], dir)).rejects.toThrow(/No build output/i);

      await mkdir(join(dir, "dist"), { recursive: true });
      const { stdout } = await runCli(["web", "serve", "--port", "5000"], dir);
      expect(stdout).toContain("5000");
      expect(stdout).toContain("Astro");

      // The human output truncates the absolute path, so the directory is
      // asserted where it is exact.
      const asJson = await runCli(["web", "serve", "--port", "5000", "--json"], dir);
      const parsed = JSON.parse(asJson.stdout) as { directory: string };
      expect(parsed.directory.endsWith("dist")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("doctor checks scripts, output and env vars", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-doctor-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { astro: "5.0.0" }, scripts: { build: "astro build" } }),
        "utf8",
      );

      const { stdout } = await runCli(["web", "doctor"], dir);

      expect(stdout).toMatch(/Checks \(\d+\)/);
      expect(stdout).toContain("build script");
      expect(stdout).toContain("dev script");
      expect(stdout).toContain("Not built yet");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("rejects unknown operations and non-web projects", async () => {
    await expect(runCli(["web", "nope"])).rejects.toThrow();
    await expect(runCli(["web", "env", "--json"])).rejects.toThrow(/No web framework/i);
  }, 30_000);
});
