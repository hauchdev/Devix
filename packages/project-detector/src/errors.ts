/**
 * Typed error hierarchy for the project-detector package.
 */

export type ProjectDetectorErrorCode = "EINVALID" | "EUNKNOWN_DETECTOR";

/**
 * Base error for exceptional project-detector failures in Devix.
 */
export class ProjectDetectorError extends Error {
  /** Machine-readable reason. */
  readonly code: ProjectDetectorErrorCode;

  private constructor(
    code: ProjectDetectorErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ProjectDetectorError";
    this.code = code;
  }

  /** Invalid usage of the API itself (e.g. empty detector id). */
  static invalid(message: string): ProjectDetectorError {
    return new ProjectDetectorError("EINVALID", message);
  }

  /** A detector with the given id is not registered. */
  static unknownDetector(id: string): ProjectDetectorError {
    return new ProjectDetectorError("EUNKNOWN_DETECTOR", `No detector registered with id: ${id}`);
  }
}
