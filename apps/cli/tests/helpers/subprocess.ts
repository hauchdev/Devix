import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const binPath = join(cliRoot, "bin", "run.js");

/** What one CLI invocation produced. */
export interface CliResult {
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * The environment every run starts from.
 *
 * `detectUnicode` reads the platform and locale, so without pinning it
 * the same assertion passes on a Windows runner and fails on Linux — the
 * layout comes out as `-` on one and `─` on the other. Colour detection
 * has the same problem. A test that asserts on layout must not depend on
 * which machine runs it, so both are pinned here and the per-test `env`
 * argument is what opts back in.
 *
 * `LANG`/`LC_ALL` are cleared as well: they are what makes the locale
 * detection say "UTF-8" on a Linux CI runner.
 */
const BASELINE_ENV: Readonly<Record<string, string | undefined>> = {
  DEVIX_UNICODE: "0",
  NO_COLOR: "1",
  FORCE_COLOR: "0",
  LANG: undefined,
  LC_ALL: undefined,
  LC_CTYPE: undefined,
};

/**
 * Runs the compiled binary and captures its output.
 *
 * Spawning a subprocess is the expensive part of the e2e suite (~500ms
 * per command on Windows), which is why the tests are split across
 * several files: Vitest runs files in parallel, so independent commands
 * stop queueing behind each other.
 *
 * A subprocess is still the honest way to test this: only it proves the
 * package builds, that `dist/commands` is discoverable, and that the
 * published binary actually starts.
 */
export async function runCli(
  args: string[],
  cwd?: string,
  stdin?: string,
  env?: Record<string, string>,
): Promise<CliResult> {
  const merged: Record<string, string | undefined> = {
    ...process.env,
    ...BASELINE_ENV,
    ...env,
  };

  return execFileAsync(process.execPath, [binPath, ...args], {
    cwd: cwd ?? cliRoot,
    encoding: "utf8",
    ...(stdin === undefined ? {} : { input: stdin }),
    env: merged,
  });
}

/** Creates a temporary directory that is removed after the test file runs. */
export function createTempDir(prefix: string): () => Promise<string> {
  const created: string[] = [];

  return async () => {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    created.push(dir);
    return dir;
  };
}

/** Removes every directory handed out by `createTempDir` in this module. */
export async function removeTempDirs(dirs: readonly string[]): Promise<void> {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
}
