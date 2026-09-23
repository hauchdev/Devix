import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runCommand } from "../src/run.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-shell-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const NODE = process.execPath;

describe("runCommand — basics", () => {
  it("captures exit code, stdout and stderr", async () => {
    const result = await runCommand(NODE, [
      "-e",
      "console.log('out'); console.error('err'); process.exitCode = 3;",
    ]);

    expect(result.exitCode).toBe(3);
    expect(result.stdout).toBe("out\n");
    expect(result.stderr).toBe("err\n");
    expect(result.executable).toBe(NODE);
    expect(result.viaCmdShim).toBe(false);
  });

  it("returns exit code 0 for successful commands", async () => {
    const result = await runCommand(NODE, ["-e", ""]);
    expect(result.exitCode).toBe(0);
  });

  it("honors the cwd option", async () => {
    const dir = await makeTempDir();
    const result = await runCommand(NODE, ["-e", "console.log(process.cwd())"], { cwd: dir });

    const printed = result.stdout.trim();
    const same =
      process.platform === "win32" ? printed.toLowerCase() === dir.toLowerCase() : printed === dir;
    expect(same).toBe(true);
  });

  it("propagates environment additions", async () => {
    const result = await runCommand(
      NODE,
      ["-e", "console.log(process.env.DEVIX_TEST ?? 'missing')"],
      {
        env: { ...process.env, DEVIX_TEST: "42" },
      },
    );

    expect(result.stdout.trim()).toBe("42");
  });

  it("keeps argv literal (no shell interpretation, cross-platform)", async () => {
    const result = await runCommand(NODE, [
      "-e",
      "console.log(process.argv.slice(1).join('|'))",
      'a"; b',
      "c'd",
    ]);

    expect(result.stdout.trim()).toBe("a\"; b|c'd");
  });
});

describe("runCommand — windows cmd shims", () => {
  it.runIf(process.platform === "win32")("runs .cmd shims through cmd.exe", async () => {
    const dir = await makeTempDir();
    const script = join(dir, "hello.cmd");
    await writeFile(script, "@echo off\r\necho shim-ok %~1\r\n");

    const result = await runCommand(script, ["arg1"]);

    expect(result.viaCmdShim).toBe(true);
    expect(result.stdout).toContain("shim-ok arg1");
  });

  it.runIf(process.platform === "win32")(
    "rejects metacharacter args with EUNSAFE_ARG",
    async () => {
      const dir = await makeTempDir();
      const script = join(dir, "hello.cmd");
      await writeFile(script, "@echo off\r\n");

      await expect(runCommand(script, ["a&calc"])).rejects.toMatchObject({ code: "EUNSAFE_ARG" });
    },
  );
});

describe("runCommand — extraPathDirectories", () => {
  it("resolves bare commands through extra path directories", async () => {
    const dir = await makeTempDir();
    if (process.platform === "win32") {
      await writeFile(join(dir, "echo-tool.cmd"), "@echo off\r\necho extra-path-ok\r\n");
    } else {
      const script = join(dir, "echo-tool");
      await writeFile(script, "#!/bin/sh\necho extra-path-ok\n");
      await chmod(script, 0o755);
    }

    const result = await runCommand("echo-tool", [], { extraPathDirectories: [dir] });

    expect(result.stdout).toContain("extra-path-ok");
  });
});

describe("runCommand — exceptional failures", () => {
  it("throws ENOENT for unknown commands", async () => {
    await expect(runCommand("definitely-missing-cmd-xyz", [])).rejects.toMatchObject({
      name: "ShellError",
      code: "ENOENT",
    });
  });

  it("throws EINVALID for empty commands", async () => {
    await expect(runCommand("   ")).rejects.toMatchObject({ code: "EINVALID" });
  });

  it("kills the process on timeout (ETIMEDOUT)", async () => {
    const start = Date.now();

    await expect(
      runCommand(NODE, ["-e", "setInterval(() => {}, 1000)"], { timeoutMs: 150 }),
    ).rejects.toMatchObject({ code: "ETIMEDOUT" });

    expect(Date.now() - start).toBeLessThan(5000);
  });

  it("rejects immediately when the signal is already aborted (EABORTED)", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(runCommand(NODE, ["-e", ""], { signal: controller.signal })).rejects.toMatchObject(
      {
        code: "EABORTED",
      },
    );
  });

  it("kills the process when the abort signal fires (EABORTED)", async () => {
    const controller = new AbortController();
    const pending = runCommand(
      NODE,
      ["-e", "console.log('started'); setInterval(() => {}, 1000)"],
      {
        signal: controller.signal,
      },
    );
    setTimeout(() => controller.abort(), 100);

    await expect(pending).rejects.toMatchObject({ code: "EABORTED" });
  });

  it("enforces the per-stream output limit (ELIMIT)", async () => {
    await expect(
      runCommand(NODE, ["-e", "process.stdout.write('x'.repeat(100000))"], {
        maxOutputBytes: 1000,
      }),
    ).rejects.toMatchObject({ code: "ELIMIT" });
  });
});
