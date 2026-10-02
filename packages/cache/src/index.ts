import { FilesystemError, readFileString, writeFileString } from "@devix-cli/filesystem";
import { mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

import { CacheError } from "./errors.js";

/** A cache entry stored on disk. */
interface CacheEntry<T> {
  /** When the entry was written (Unix epoch ms). */
  readonly writtenAt: number;
  /** TTL in milliseconds, or `null` for no expiry. */
  readonly ttlMs: number | null;
  /** Serialized value. */
  readonly value: T;
}

/** Options for `Cache.get` / `Cache.set`. */
export interface CacheOptions {
  /** Directory where cache files are stored. Defaults to `~/.cache/devix`. */
  readonly directory?: string;
}

/** Filesystem-backed cache with per-entry TTL. */
export class Cache {
  readonly directory: string;

  constructor(options?: CacheOptions) {
    const directory = options?.directory;
    if (directory !== undefined && !isAbsolute(directory)) {
      throw CacheError.invalid(`Cache directory must be absolute: ${directory}`);
    }
    this.directory = directory ?? join(homedir(), ".cache", "devix");
  }

  private filePath(key: string): string {
    // Keys are hashed to a safe file name so caller ids like
    // "pnpm:version:/some/path" do not need manual escaping.
    const safeKey = Buffer.from(key, "utf8").toString("base64url");
    return join(this.directory, `${safeKey}.json`);
  }

  /** Read a cached value if it exists and has not expired. */
  async get<T>(key: string): Promise<T | undefined> {
    const path = this.filePath(key);
    let raw: string;
    try {
      raw = await readFileString(path);
    } catch (error) {
      if (error instanceof FilesystemError && error.code === "ENOENT") {
        return undefined;
      }
      throw CacheError.io(`Cannot read cache entry ${key}`, error);
    }

    let entry: CacheEntry<T>;
    try {
      entry = JSON.parse(raw) as CacheEntry<T>;
    } catch {
      // Corrupted entry: treat as a miss and remove it.
      await rm(path, { force: true }).catch(() => {
        // Best-effort cleanup.
      });
      return undefined;
    }

    if (entry.ttlMs !== null && Date.now() - entry.writtenAt > entry.ttlMs) {
      await rm(path, { force: true }).catch(() => {
        // Best-effort cleanup.
      });
      return undefined;
    }

    return entry.value;
  }

  /** Write a value to the cache with an optional TTL in milliseconds. */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const path = this.filePath(key);
    const entry: CacheEntry<T> = {
      writtenAt: Date.now(),
      ttlMs: ttlMs ?? null,
      value,
    };
    try {
      await mkdir(this.directory, { recursive: true });
      await writeFileString(path, JSON.stringify(entry), { createDirectories: true });
    } catch (error) {
      throw CacheError.io(`Cannot write cache entry ${key}`, error);
    }
  }

  /** Remove a single cache entry. */
  async delete(key: string): Promise<void> {
    await rm(this.filePath(key), { force: true }).catch(() => {
      // Best-effort cleanup.
    });
  }

  /** Clear the whole cache directory. */
  async clear(): Promise<void> {
    await rm(this.directory, { recursive: true, force: true }).catch(() => {
      // Best-effort cleanup.
    });
  }
}
