import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { FilesystemError, toFilesystemError } from "./errors.js";

export interface WriteFileOptions {
  createDirectories?: boolean;
  mode?: number;
}

export async function writeFileString(
  path: string,
  contents: string,
  options?: WriteFileOptions,
): Promise<void> {
  const createDirectories = options?.createDirectories ?? true;

  try {
    if (createDirectories) {
      await mkdir(dirname(path), { recursive: true });
    }
    await writeFile(path, contents, { encoding: "utf8", mode: options?.mode });
  } catch (error) {
    throw toFilesystemError(path, error);
  }
}

export async function readJson<T>(path: string): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    throw toFilesystemError(path, error);
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw FilesystemError.invalidJson(path, error);
  }
}
