import { isFile, writeFileString } from "@devix-cli/filesystem";
import { join } from "node:path";

import { ConfigError } from "./errors.js";
import { CONFIG_FILE_NAMES, validateConfigShape } from "./types.js";
import type { DevixConfig } from "./types.js";

/** Options for config path lookup. */
export interface ConfigPathOptions {
  /** Directory to start the upward search from. Defaults to `process.cwd()`. */
  readonly cwd?: string;
}

/**
 * Finds the nearest config file upward from `cwd`. Returns the path of
 * the first existing file, or the default path (`cwd/devix.config.json`)
 * when none exists.
 */
export async function findConfigPath(options?: ConfigPathOptions): Promise<string> {
  const cwd = options?.cwd ?? process.cwd();

  for (let dir = cwd; ; ) {
    for (const name of CONFIG_FILE_NAMES) {
      const candidate = join(dir, name);
      if (await isFile(candidate)) {
        return candidate;
      }
    }

    const parent = join(dir, "..");
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return join(cwd, CONFIG_FILE_NAMES[0] ?? "devix.config.json");
}

function keyParts(key: string): string[] {
  return key.split(".").filter((part) => part.length > 0);
}

/**
 * Reads a value from a config object using a dotted key path.
 * Returns `undefined` when the path does not exist.
 */
export function getConfigValue(config: DevixConfig, key: string): unknown {
  const parts = keyParts(key);
  if (parts.length === 0) {
    return undefined;
  }
  let current: unknown = config;
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Sets a value in a config object using a dotted key path.
 * Returns a new config object; the input is not mutated.
 */
export function setConfigValue(config: DevixConfig, key: string, value: unknown): DevixConfig {
  const parts = keyParts(key);
  const [head, ...tail] = parts;
  if (head === undefined) {
    throw ConfigError.invalidConfig("<set>", ["config key cannot be empty"]);
  }

  const next: Record<string, unknown> = { ...config };

  let current = next;
  let pending: string | undefined = head;

  for (const part of tail) {
    const existing = pending === undefined ? undefined : current[pending];
    if (typeof existing !== "object" || existing === null || Array.isArray(existing)) {
      if (pending !== undefined) {
        current[pending] = {};
      }
    }
    current = (
      pending === undefined ? current : (current[pending] as Record<string, unknown>)
    ) as Record<string, unknown>;
    pending = part;
  }

  if (pending !== undefined) {
    current[pending] = value;
  }

  const result = next as DevixConfig;
  const problems = validateConfigShape(result);
  if (problems.length > 0) {
    throw ConfigError.invalidConfig("<set>", problems);
  }

  return result;
}

/** Flattens a config object into dotted key-value pairs. */
export function listConfig(config: DevixConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  function walk(value: unknown, prefix: string): void {
    if (value === undefined) {
      return;
    }
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      result[prefix] = value;
      return;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      // The root object is a container, not a leaf value: an empty
      // config flattens to nothing, while an empty nested object
      // (`features: {}`) is kept as a leaf.
      if (prefix.length > 0) {
        result[prefix] = value;
      }
      return;
    }
    for (const [key, nested] of entries) {
      const nextKey = prefix.length > 0 ? `${prefix}.${key}` : key;
      walk(nested, nextKey);
    }
  }

  walk(config, "");
  return result;
}

/**
 * Writes a config object to a file as formatted JSON. The file name must
 * be one of the recognized config file names.
 */
export async function writeConfig(path: string, config: DevixConfig): Promise<void> {
  const lower = path.toLowerCase();
  const hasKnownName = CONFIG_FILE_NAMES.some(
    (name) => lower === name || lower.endsWith(`/${name}`) || lower.endsWith(`\\${name}`),
  );

  if (!hasKnownName) {
    throw ConfigError.unsupportedFormat(path);
  }

  const problems = validateConfigShape(config);
  if (problems.length > 0) {
    throw ConfigError.invalidConfig(path, problems);
  }

  try {
    await writeFileString(path, `${JSON.stringify(config, null, 2)}\n`, {
      createDirectories: true,
    });
  } catch (error) {
    throw ConfigError.io(path, error);
  }
}
