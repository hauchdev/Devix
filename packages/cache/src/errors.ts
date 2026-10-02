/** Typed errors for the cache package. */
export class CacheError extends Error {
  readonly code: "EIO" | "EINVALID";

  private constructor(code: "EIO" | "EINVALID", message: string) {
    super(message);
    this.name = "CacheError";
    this.code = code;
  }

  static io(message: string, cause?: unknown): CacheError {
    const error = new CacheError("EIO", message);
    error.cause = cause;
    return error;
  }

  static invalid(message: string): CacheError {
    return new CacheError("EINVALID", message);
  }
}
