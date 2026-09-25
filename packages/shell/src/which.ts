import { access, constants } from "node:fs/promises";
import { delimiter, isAbsolute, resolve } from "node:path";

const WINDOWS_EXECUTABLE_EXTENSIONS = [".com", ".exe", ".bat", ".cmd"];

function splitPathEnv(): string[] {
  const raw = process.env.PATH ?? "";
  return raw.split(delimiter).filter((dir) => dir.length > 0);
}

function hasWindowsExecutableExtension(path: string): boolean {
  const lower = path.toLowerCase();
  return WINDOWS_EXECUTABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function windowsExtensions(): string[] {
  const raw = process.env.PATHEXT ?? "";
  const fromEnv = raw
    .split(";")
    .map((ext) => ext.trim().toLowerCase())
    .filter((ext) => ext.length > 1 && ext.startsWith("."));
  const usable = [...new Set(fromEnv)].filter((ext) =>
    (WINDOWS_EXECUTABLE_EXTENSIONS as string[]).includes(ext),
  );
  return usable.length > 0 ? usable : WINDOWS_EXECUTABLE_EXTENSIONS;
}

async function canExecute(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findExecutableAt(candidate: string): Promise<string | undefined> {
  if (process.platform !== "win32") {
    return (await canExecute(candidate)) ? candidate : undefined;
  }

  if (hasWindowsExecutableExtension(candidate)) {
    return (await canExecute(candidate)) ? candidate : undefined;
  }

  const extensions = windowsExtensions();
  const checks = await Promise.all(
    extensions.map(async (ext) => ({
      path: candidate + ext,
      ok: await canExecute(candidate + ext),
    })),
  );
  return checks.find((check) => check.ok)?.path;
}

export async function which(command: string): Promise<string | undefined> {
  if (command.length === 0) {
    return undefined;
  }

  if (isAbsolute(command)) {
    return findExecutableAt(command);
  }

  const dirs = splitPathEnv();
  if (dirs.length === 0) {
    return undefined;
  }

  // Directories are probed in parallel; results keep PATH order because
  // Promise.all preserves the input order of the probes.
  const hits = await Promise.all(dirs.map((dir) => findExecutableAt(resolve(dir, command))));
  return hits.find((hit) => hit !== undefined);
}

export async function commandExists(command: string): Promise<boolean> {
  return (await which(command)) !== undefined;
}
