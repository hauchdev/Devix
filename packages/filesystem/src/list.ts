import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { toFilesystemError } from "./errors.js";

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
}

export async function listDir(dir: string): Promise<DirEntry[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      path: join(dir, entry.name),
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      isSymlink: entry.isSymbolicLink(),
    }));
  } catch (error) {
    throw toFilesystemError(dir, error);
  }
}

export async function listDirSafe(dir: string): Promise<DirEntry[]> {
  try {
    return await listDir(dir);
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
