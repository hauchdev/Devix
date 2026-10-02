import { Cache } from "@devix-cli/cache";

import type { DoctorServices } from "./types.js";

/** Options for `withCachedTools`. */
export interface CachedToolsOptions {
  /** Cache instance. Defaults to `~/.cache/devix`. */
  readonly cache?: Cache;
  /** TTL for tool probes in milliseconds. Defaults to 5 minutes. */
  readonly ttlMs?: number;
}

/**
 * Wraps a `DoctorServices` so repeated tool probes are served from disk.
 *
 * Only successful probes are cached: a tool that cannot be resolved is
 * re-checked every run, so installing a tool takes effect immediately
 * instead of waiting for a negative entry to expire. Cache failures are
 * swallowed — the cache is an optimization, never a dependency.
 */
export function withCachedTools(
  services: DoctorServices,
  options?: CachedToolsOptions,
): DoctorServices {
  const cache = options?.cache ?? new Cache();
  const ttlMs = options?.ttlMs ?? 5 * 60_000;

  return {
    async getToolVersion(tool: string, versionArg: string): Promise<string | undefined> {
      const key = `doctor:tool-version:${tool}:${versionArg}`;

      try {
        const cached = await cache.get<string>(key);
        if (cached !== undefined) {
          return cached;
        }
      } catch {
        // Cache read failed: fall through to the real probe.
      }

      const version = await services.getToolVersion(tool, versionArg);
      if (version === undefined) {
        return undefined;
      }

      try {
        await cache.set(key, version, ttlMs);
      } catch {
        // Cache write failed: the probe result is still valid.
      }

      return version;
    },
  };
}
