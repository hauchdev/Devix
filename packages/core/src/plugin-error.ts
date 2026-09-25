export type PluginErrorCode = "EINVALID" | "EDUPLICATE" | "EINCONSISTENT";

/**
 * Base error for plugin registration failures in Devix core.
 */
export class PluginError extends Error {
  /** Machine-readable reason. */
  readonly code: PluginErrorCode;

  private constructor(code: PluginErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PluginError";
    this.code = code;
  }

  /** A manifest or id failed validation. */
  static invalid(message: string): PluginError {
    return new PluginError("EINVALID", message);
  }

  /** A plugin id was registered twice. */
  static duplicate(id: string): PluginError {
    return new PluginError("EDUPLICATE", `plugin already registered: ${id}`);
  }

  /** Internal registry inconsistency. */
  static inconsistent(id: string): PluginError {
    return new PluginError("EINCONSISTENT", `plugin registry inconsistency: ${id}`);
  }
}
