
export type ShellErrorCode =
  | "ENOENT"
  | "ESPAWN"
  | "ETIMEDOUT"
  | "EABORTED"
  | "ELIMIT"
  | "EUNSAFE_ARG"
  | "EINVALID";

export class ShellError extends Error {
  readonly code: ShellErrorCode;
  readonly command: string | undefined;

  private constructor(
    code: ShellErrorCode,
    message: string,
    command: string | undefined,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ShellError";
    this.code = code;
    this.command = command;
  }

  static notFound(command: string): ShellError {
    return new ShellError("ENOENT", `Command not found: ${command}`, command);
  }

  static spawnError(command: string, cause: unknown): ShellError {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return new ShellError("ESPAWN", `Failed to spawn ${command}: ${reason}`, command, { cause });
  }

  static timeout(command: string, timeoutMs: number): ShellError {
    return new ShellError(
      "ETIMEDOUT",
      `Command timed out after ${String(timeoutMs)} ms: ${command}`,
      command,
    );
  }

  static aborted(command: string): ShellError {
    return new ShellError("EABORTED", `Command aborted: ${command}`, command);
  }

  static limit(command: string, maxBytes: number): ShellError {
    return new ShellError(
      "ELIMIT",
      `Command output exceeded ${String(maxBytes)} bytes: ${command}`,
      command,
    );
  }

  static unsafeArg(command: string, argument: string): ShellError {
    return new ShellError(
      "EUNSAFE_ARG",
      `Argument contains shell metacharacters and was rejected: ${JSON.stringify(argument)}`,
      command,
    );
  }

  static invalid(message: string): ShellError {
    return new ShellError("EINVALID", message, undefined);
  }
}
