import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runDoctor } from "../src/doctor.js";
import { checkEnvironment } from "../src/environment.js";
import type { DoctorServices } from "../src/types.js";
import { createDefaultRegistry } from "@devix-cli/project-detector";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-doctor-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** All tools present, with fixed versions: fully deterministic. */
const fakeServices: DoctorServices = {
  async getToolVersion(tool: string): Promise<string | undefined> {
    return `9.9.9-${tool}`;
  },
};

describe("checkEnvironment", () => {
  it("reports every tool as ok with parsed versions", async () => {
    const checks = await checkEnvironment(fakeServices);

    expect(checks.map((c) => c.id)).toEqual(["node", "pnpm", "npm", "yarn", "bun", "git"]);
    for (const check of checks) {
      expect(check.status).toBe("ok");
      expect(check.detail).toContain("9.9.9");
    }
  });

  it("reports missing tools without throwing", async () => {
    const partial: DoctorServices = {
      async getToolVersion(tool: string): Promise<string | undefined> {
        return tool === "yarn" || tool === "bun" ? undefined : `9.9.9-${tool}`;
      },
    };

    const checks = await checkEnvironment(partial);

    const byId = new Map(checks.map((c) => [c.id, c]));
    expect(byId.get("yarn")?.status).toBe("missing");
    expect(byId.get("bun")?.status).toBe("missing");
    expect(byId.get("node")?.status).toBe("ok");
    expect(byId.get("yarn")?.detail).toBeUndefined();
  });
});

describe("runDoctor", () => {
  it("combines environment and project sections on a node project", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "x", packageManager: "pnpm@12.5.1" }),
      "utf8",
    );
    await writeFile(join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

    const report = await runDoctor({ cwd: dir, services: fakeServices });

    expect(report.environment.checks.every((c) => c.status === "ok")).toBe(true);
    expect(report.project.isProject).toBe(true);
    expect(report.project.languages).toContain("node");
    expect(report.project.packageManagers).toContain("pnpm");
    expect(report.project.root).toBe(dir);
  });

  it("reports an empty project without error", async () => {
    const dir = await makeTempDir();

    const report = await runDoctor({ cwd: dir, services: fakeServices });

    expect(report.project.isProject).toBe(false);
    expect(report.project.languages).toEqual([]);
  });

  it("accepts a custom registry", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package.json"), "{}", "utf8");
    const registry = createDefaultRegistry();

    const report = await runDoctor({ cwd: dir, registry, services: fakeServices });

    expect(report.project.isProject).toBe(true);
  });
});
