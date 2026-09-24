import { ConfigError } from "./errors.js";

/**
 * Parses config file content as strict JSON.
 *
 * We deliberately do NOT use `eval`, `new Function` or dynamic
 * `import()` of project files: config must be data, never code.
 *
 * An empty (or whitespace-only) file is a valid empty config,
 * not a parse error: configuration is optional by design.
 */
export function parseConfigContent(path: string, content: string): unknown {
  if (content.trim().length === 0) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch (error) {
    throw ConfigError.parse(path, error);
  }
  return parsed;
}
