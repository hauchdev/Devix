import { stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { FilesystemError } from "./errors.js";

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
      // Keep walking up.
    }
  }
  return undefined;
}

export function resolveWithin(dir: string, entry: string): string {
  const base = resolve(dir);
  const target = resolve(base, entry);
  const rel = relative(base, target);

  if (rel !== "" && rel !== "." && (rel.startsWith("..") || isAbsolute(rel))) {
    throw FilesystemError.pathEscape(target);
  }

  return target;
}
