import { spawn } from "node:child_process";
import { resolve as resolvePath } from "node:path";
import { platform } from "node:process";

import { ShellError } from "./errors.js";
import { which } from "./which.js";
import { assertSafeCmdArgs, isCmdShim } from "./windows.js";

const DEFAULT_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

export interface RunCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  signal?: AbortSignal;
  maxOutputBytes?: number;
  extraPathDirectories?: readonly string[];
}

export interface CommandResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  executable: string;
  viaCmdShim: boolean;
}

interface CollectState {
  text: string;
  bytes: number;
}

function createCollector(): CollectState {
  return { text: "", bytes: 0 };
}

function appendChunk(state: CollectState, chunk: Buffer, maxBytes: number, command: string): void {
  state.bytes += chunk.byteLength;
  if (state.bytes > maxBytes) {
    throw ShellError.limit(command, maxBytes);
  }
  state.text += chunk.toString("utf8");
}

export async function runCommand(
  command: string,
  args: readonly string[] = [],
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  if (command.trim().length === 0) {
    throw ShellError.invalid("Command must be a non-empty string");
  }

  const executable = await resolveExecutable(command, options.extraPathDirectories);
  if (executable === undefined) {
    throw ShellError.notFound(command);
  }

  const viaCmdShim = platform === "win32" && isCmdShim(executable);
  if (viaCmdShim) {
    assertSafeCmdArgs(command, args);
  }

  const maxBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const stdoutState = createCollector();
  const stderrState = createCollector();
  const timeoutMs = options.timeoutMs;

  return await new Promise<CommandResult>((resolvePromise, rejectPromise) => {
    let settled = false;
    let timeoutHandle: NodeJS.Timeout | undefined;
    let abortHandler: (() => void) | undefined;

    const child = viaCmdShim
      ? spawn("cmd.exe", ["/d", "/s", "/c", executable, ...args], buildSpawnOptions(options))
      : spawn(executable, args, buildSpawnOptions(options));

    child.stdout?.on("data", (chunk: Buffer) => {
      try {
        appendChunk(stdoutState, chunk, maxBytes, command);
      } catch (error) {
        finishAsError(error);
        child.kill();
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      try {
        appendChunk(stderrState, chunk, maxBytes, command);
      } catch (error) {
        finishAsError(error);
        child.kill();
      }
    });

    child.on("error", (error) => {
      finishAsError(error);
    });

    child.on("close", (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolvePromise({
        exitCode: code,
        signal: signal ?? null,
        stdout: stdoutState.text,
        stderr: stderrState.text,
        executable,
        viaCmdShim,
      });
    });

    if (timeoutMs !== undefined) {
      timeoutHandle = setTimeout(() => {
        finishAsError(ShellError.timeout(command, timeoutMs));
        child.kill();
      }, timeoutMs);
    }

    if (options.signal !== undefined) {
      if (options.signal.aborted) {
        finishAsError(ShellError.aborted(command));
        child.kill();
      } else {
        abortHandler = () => {
          finishAsError(ShellError.aborted(command));
          child.kill();
        };
        options.signal.addEventListener("abort", abortHandler, { once: true });
      }
    }

    function finishAsError(error: unknown): void {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      rejectPromise(error instanceof ShellError ? error : ShellError.spawnError(command, error));
    }

    function cleanup(): void {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
      if (options.signal !== undefined && abortHandler !== undefined) {
        options.signal.removeEventListener("abort", abortHandler);
      }
    }
  });
}

function buildSpawnOptions(options: RunCommandOptions): {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  windowsHide: boolean;
} {
  return {
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    ...(options.env === undefined ? {} : { env: options.env }),
    // Never flash a console window when running windowless on Windows.
    windowsHide: true,
  };
}

async function resolveExecutable(
  command: string,
  extraPathDirectories: readonly string[] | undefined,
): Promise<string | undefined> {
  const isAbsoluteLike = command.includes("/") || (platform === "win32" && command.includes("\\"));
  if (isAbsoluteLike) {
    return command;
  }

  if (extraPathDirectories !== undefined) {
    for (const dir of extraPathDirectories) {
      const candidate = resolvePath(dir, command);
      const resolved = await which(candidate);
      if (resolved !== undefined) {
        return resolved;
      }
    }
  }

  return which(command);
}
