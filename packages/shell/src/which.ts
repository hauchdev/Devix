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

async function canExecute(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function which(command: string): Promise<string | undefined> {
  if (command.length === 0) {
    return undefined;
  }

  const candidates: string[] = [];

  if (isAbsolute(command)) {
    candidates.push(command);
  } else {
    for (const dir of splitPathEnv()) {
      candidates.push(resolve(dir, command));
    }
  }

  for (const candidate of candidates) {
    if (process.platform !== "win32") {
      if (await canExecute(candidate)) {
        return candidate;
      }
      continue;
    }

    if (hasWindowsExecutableExtension(candidate) && (await canExecute(candidate))) {
      return candidate;
    }
    for (const ext of WINDOWS_EXECUTABLE_EXTENSIONS) {
      const withExt = candidate + ext;
      if (await canExecute(withExt)) {
        return withExt;
      }
    }
  }

  return undefined;
}

export async function commandExists(command: string): Promise<boolean> {
  return (await which(command)) !== undefined;
}
