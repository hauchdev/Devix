/**
 * Typed error hierarchy for the @devix-cli/deps package.
 */

export type DepsErrorCode = "EPM_NOT_FOUND" | "EPM_UNDETECTED" | "ECOMMAND_FAILED" | "EINVALID";

/**
 * Base error for exceptional dependency-operation failures in Devix.
 */
export class DepsError extends Error {
  /** Machine-readable reason. */
  readonly code: DepsErrorCode;

  private constructor(code: DepsErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DepsError";
    this.code = code;
  }

  /** The detected package manager executable is not on PATH. */
  static pmNotFound(manager: string): DepsError {
    return new DepsError("EPM_NOT_FOUND", `package manager not found on PATH: ${manager}`);
  }

  /** No package manager could be detected for the project. */
  static pmUndetected(directory: string): DepsError {
    return new DepsError("EPM_UNDETECTED", `no package manager detected for: ${directory}`);
  }

  /** A delegated package manager command failed. */
  static commandFailed(manager: string, args: string, exitCode: number): DepsError {
    return new DepsError("ECOMMAND_FAILED", `${manager} ${args} failed with exit code ${exitCode}`);
  }

  /** Invalid usage of the API itself. */
  static invalid(message: string): DepsError {
    return new DepsError("EINVALID", message);
  }
}
