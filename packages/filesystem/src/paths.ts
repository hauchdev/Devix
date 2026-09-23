import { stat } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";

import { toFilesystemError } from "./errors.js";

export async function* walkUp(startDir: string): AsyncGenerator<string> {
  let current = resolve(startDir);
  const root = resolve(current, sep);

  while (true) {
    yield current;
    if (current === root) {
      return;
    }
    current = dirname(current);
  }
}

export async function findUp(startDir: string, entry: string): Promise<string | undefined> {
  for await (const dir of walkUp(startDir)) {
    const candidate = resolve(dir, entry);
    try {
      await stat(candidate);
      return dir;
    } catch {
    }
  }
  return undefined;
}

export function resolveWithin(dir: string, entry: string): string {
  const base = resolve(dir);
  const target = resolve(base, entry);

  if (target !== base && !target.startsWith(base + sep)) {
    throw toFilesystemError(target, new Error("path escapes the base directory"));
  }

  return target;
}

export function isAbsolutePath(path: string): boolean {
  return isAbsolute(path);
}
