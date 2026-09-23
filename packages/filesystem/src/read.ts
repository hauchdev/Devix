import { readFile } from "node:fs/promises";

import { toFilesystemError } from "./errors.js";

export async function readFileString(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    throw toFilesystemError(path, error);
  }
}

export async function readFileBuffer(path: string): Promise<Buffer> {
  try {
    return await readFile(path);
  } catch (error) {
    throw toFilesystemError(path, error);
  }
}
