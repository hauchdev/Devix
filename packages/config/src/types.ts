/**
 * Shared types for Devix configuration.
 *
 * The config schema is intentionally small: a name and a set of
 * feature toggles. Config files are strict JSON — config is data,
 * never code — and unknown keys are rejected to catch typos early.
 * adding a key here is a documented, breaking-ish change.
 */

export interface DevixConfig {
  /** Project name used in reports and summaries. */
  name?: string;
  /** Feature toggles. */
  features?: DevixConfigFeatures;
}

export interface DevixConfigFeatures {
  /** Enable the doctor command. */
  doctor?: boolean;
  /** Enable git helpers. */
  git?: boolean;
  /** Enable dependency helpers. */
  deps?: boolean;
}

/** Recognized config file names, in priority order. */
export const CONFIG_FILE_NAMES: readonly string[] = ["devix.config.json", "devix.json"];

/**
 * Runtime guard for the parsed config.
 *
 * `undefined` / `null` are valid (empty config). Everything else must
 * be a plain object whose keys match the schema exactly.
 *
 * Returns the list of problems found; empty means valid.
 */
export function validateConfigShape(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return ["expected a config object"];
  }

  const problems: string[] = [];
  const record = value as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (key === "name") {
      if (typeof record["name"] !== "string") {
        problems.push(`"name" must be a string (got ${typeof record["name"]})`);
      }
      continue;
    }

    if (key === "features") {
      const features = record["features"];
      if (typeof features !== "object" || features === null || Array.isArray(features)) {
        problems.push(`"features" must be an object`);
        continue;
      }
      for (const featureKey of Object.keys(features as Record<string, unknown>)) {
        const featureValue = (features as Record<string, unknown>)[featureKey];
        if (featureKey !== "doctor" && featureKey !== "git" && featureKey !== "deps") {
          problems.push(`unknown feature "${featureKey}"`);
        } else if (typeof featureValue !== "boolean") {
          problems.push(`feature "${featureKey}" must be a boolean (got ${typeof featureValue})`);
        }
      }
      continue;
    }

    problems.push(`unknown key "${key}"`);
  }

  return problems;
}
