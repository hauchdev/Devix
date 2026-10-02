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
  return execFileAsync(process.execPath, [binPath, ...args], {
    cwd: cwd ?? cliRoot,
    encoding: "utf8",
    ...(stdin === undefined ? {} : { input: stdin }),
    ...(env === undefined ? {} : { env: { ...process.env, ...env } }),
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
