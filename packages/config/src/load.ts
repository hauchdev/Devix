import { isFile, readFileString, walkUp } from "@devix/filesystem";
import { join } from "node:path";

import { ConfigError } from "./errors.js";
import { parseConfigContent } from "./parse.js";
import {
  CONFIG_FILE_NAMES,
  validateConfigShape,
  type DevixConfig,
  type DevixConfigFeatures,
} from "./types.js";

export interface LoadConfigOptions {
  /** Directory where the upward search starts. Defaults to `process.cwd()`. */
  cwd?: string;
}

/**
 * Loads the Devix config for a project.
 *
 * The search starts at `cwd` (or `process.cwd()`) and walks up parent
 * directories until one of `CONFIG_FILE_NAMES` is found; the nearest
 * file wins. When no config exists, this is a normal result and the
 * function resolves to `undefined`.
 *
 * An empty file is valid and yields `{}`. A file that exists but has
 * an unrecognized name throws `EUNSUPPORTED_FORMAT`; malformed JSON
 * throws `EPARSE`; a wrong shape throws `EINVALID_CONFIG`.
 */
export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<DevixConfig | undefined> {
  const startDir = options.cwd ?? process.cwd();

  for await (const dir of walkUp(startDir)) {
    for (const name of CONFIG_FILE_NAMES) {
      const candidate = join(dir, name);
      if (await isFile(candidate)) {
        return await readConfigFile(candidate);
      }
    }
  }

  return undefined;
}

/**
 * Reads and validates a specific config file.
 *
 * Use this when the caller already knows the file path (e.g. an
 * explicit `--config` flag in the future).
 */
export async function readConfigFile(path: string): Promise<DevixConfig> {
  const lower = path.toLowerCase();
  const hasKnownName = CONFIG_FILE_NAMES.some(
    (name) => lower === name || lower.endsWith(`/${name}`) || lower.endsWith(`\\${name}`),
  );

  if (!hasKnownName) {
    throw ConfigError.unsupportedFormat(path);
  }

  let content: string;
  try {
    content = await readFileString(path);
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw ConfigError.io(path, error);
  }

  const parsed = parseConfigContent(path, content);
  const problems = validateConfigShape(parsed);

  if (problems.length > 0) {
    throw ConfigError.invalidConfig(path, problems);
  }

  return normalizeConfig(parsed);
}

function normalizeConfig(value: unknown): DevixConfig {
  if (value === undefined || value === null) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const config: DevixConfig = {};

  const name = record["name"];
  if (typeof name === "string") {
    config.name = name;
  }

  const features = record["features"];
  if (typeof features === "object" && features !== null) {
    const featureRecord = features as Record<string, unknown>;
    const normalized: DevixConfigFeatures = {};

    const doctor = featureRecord["doctor"];
    if (typeof doctor === "boolean") {
      normalized.doctor = doctor;
    }

    const git = featureRecord["git"];
    if (typeof git === "boolean") {
      normalized.git = git;
    }

    const deps = featureRecord["deps"];
    if (typeof deps === "boolean") {
      normalized.deps = deps;
    }

    config.features = normalized;
  }

  return config;
}
