
export type FilesystemErrorCode =
  | "ENOENT"
  | "EISDIR"
  | "ENOTDIR"
  | "EEXIST"
  | "EINVALID_JSON"
  | "EIO";

export class FilesystemError extends Error {
  readonly code: FilesystemErrorCode;
  readonly path: string | undefined;

  private constructor(
    code: FilesystemErrorCode,
    message: string,
    path: string | undefined,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "FilesystemError";
    this.code = code;
    this.path = path;
  }

  static notFound(path: string): FilesystemError {
    return new FilesystemError("ENOENT", `Path does not exist: ${path}`, path);
  }

  static isDirectory(path: string): FilesystemError {
    return new FilesystemError("EISDIR", `Path is a directory, not a file: ${path}`, path);
  }

  static notDirectory(path: string): FilesystemError {
    return new FilesystemError("ENOTDIR", `Path is a file, not a directory: ${path}`, path);
  }

  static alreadyExists(path: string): FilesystemError {
    return new FilesystemError("EEXIST", `Path already exists: ${path}`, path);
  }

  static invalidJson(path: string, cause: unknown): FilesystemError {
    return new FilesystemError("EINVALID_JSON", `File does not contain valid JSON: ${path}`, path, {
      cause,
    });
  }

  static io(path: string | undefined, cause: unknown): FilesystemError {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return new FilesystemError(
      "EIO",
      path === undefined
        ? `Filesystem I/O error: ${reason}`
        : `Filesystem I/O error on ${path}: ${reason}`,
      path,
      { cause },
    );
  }
}

export function toFilesystemError(path: string, error: unknown): FilesystemError {
  if (error instanceof FilesystemError) {
    return error;
  }

  const errno = (error as NodeJS.ErrnoException | null)?.code;

  switch (errno) {
    case "ENOENT":
      return FilesystemError.notFound(path);
    case "EISDIR":
      return FilesystemError.isDirectory(path);
    case "ENOTDIR":
      return FilesystemError.notDirectory(path);
    case "EEXIST":
      return FilesystemError.alreadyExists(path);
    default:
      return FilesystemError.io(path, error);
  }
}
