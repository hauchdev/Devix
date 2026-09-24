/**
 * Typed error hierarchy for the config package.
 *
 * Loading a project with no configuration is a normal result
 * (`undefined`); exceptional failures (invalid shape, unsupported
 * format, unparsable content, I/O) throw `ConfigError`.
 */

export type ConfigErrorCode = "EINVALID_CONFIG" | "EUNSUPPORTED_FORMAT" | "EPARSE" | "EIO";

/**
 * Base error for exceptional config failures in Devix.
 */
export class ConfigError extends Error {
  /** Machine-readable reason. */
  readonly code: ConfigErrorCode;
  /** The config file involved, when known. */
  readonly path: string | undefined;

  private constructor(
    code: ConfigErrorCode,
    message: string,
    path: string | undefined,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ConfigError";
    this.code = code;
    this.path = path;
  }

  /** The file exists but does not match the expected config shape. */
  static invalidConfig(path: string, problems: readonly string[]): ConfigError {
    const detail = problems.length === 0 ? "" : `: ${problems.join("; ")}`;
    return new ConfigError("EINVALID_CONFIG", `Invalid devix config${detail}`, path);
  }

  /** The file has a recognized name but a format Devix cannot read. */
  static unsupportedFormat(path: string): ConfigError {
    return new ConfigError(
      "EUNSUPPORTED_FORMAT",
      `Unsupported config format: ${path} (expected .json)`,
      path,
    );
  }

  /** The file content could not be parsed (invalid JSON, …). */
  static parse(path: string, cause: unknown): ConfigError {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return new ConfigError("EPARSE", `Failed to parse config file ${path}: ${reason}`, path, {
      cause,
    });
  }

  /** Reading the file failed (permissions, sudden disappearance, …). */
  static io(path: string, cause: unknown): ConfigError {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return new ConfigError("EIO", `Failed to read config file ${path}: ${reason}`, path, {
      cause,
    });
  }
}
