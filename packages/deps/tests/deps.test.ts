import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { detectPackageManager } from "../src/detect.js";
import { runDepsCommand } from "../src/run.js";
import type { CommandOutput, DepsRunner } from "../src/run.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-deps-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("detectPackageManager", () => {
  it("prefers pnpm when both pnpm and npm markers exist", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
    await writeFile(join(dir, "package-lock.json"), "{}", "utf8");
    await writeFile(join(dir, "package.json"), "{}", "utf8");

    expect(await detectPackageManager(dir)).toBe("pnpm");
  });

  it("detects npm from a bare package.json", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package.json"), "{}", "utf8");

    expect(await detectPackageManager(dir)).toBe("npm");
  });

  it("throws EPM_UNDETECTED with no markers", async () => {
    const dir = await makeTempDir();

    await expect(detectPackageManager(dir)).rejects.toMatchObject({
      name: "DepsError",
      code: "EPM_UNDETECTED",
    });
  });
});

describe("runDepsCommand", () => {
  const recording: DepsRunner = {
    async run(manager, args, cwd): Promise<CommandOutput> {
      lastCall = { manager, args: [...args], cwd };
      return { stdout: `ran ${manager} ${args.join(" ")}`, stderr: "", exitCode: 0 };
    },
  };
  let lastCall: { manager: string; args: string[]; cwd: string } | undefined;

  it("delegates list to the detected manager with native args", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

    const { manager, output } = await runDepsCommand(dir, "list", recording);

    expect(manager).toBe("pnpm");
    expect(output.exitCode).toBe(0);
    expect(lastCall).toMatchObject({
      manager: "pnpm",
      args: ["list", "--depth=0"],
      cwd: dir,
    });
  });

  it("maps bun list to bun pm ls", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "bun.lock"), "{}", "utf8");

    await runDepsCommand(dir, "list", recording);

    expect(lastCall?.args).toEqual(["pm", "ls"]);
  });

  it("returns non-zero exit codes as results, not throws", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "package.json"), "{}", "utf8");
    const failing: DepsRunner = {
      async run(): Promise<CommandOutput> {
        return { stdout: "outdated packages listed", stderr: "", exitCode: 1 };
      },
    };

    const { output } = await runDepsCommand(dir, "outdated", failing);

    expect(output.exitCode).toBe(1);
    expect(output.stdout).toContain("outdated");
  });
});
