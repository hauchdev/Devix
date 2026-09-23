/**
 * Typed error hierarchy for the shell package.
 *
 * Exceptional failures (command not found, spawn failure, timeout, abort,
 * output limit, unsafe arguments) throw `ShellError`; a non-zero exit
 * code is a normal `CommandResult`, not an error.
 */

export type ShellErrorCode =
  | "ENOENT"
  | "ESPAWN"
  | "ETIMEDOUT"
  | "EABORTED"
  | "ELIMIT"
  | "EUNSAFE_ARG"
  | "EINVALID";

/**
 * Base error for exceptional shell failures in Devix.
 */
export class ShellError extends Error {
  /** Machine-readable reason. */
  readonly code: ShellErrorCode;
  /** The executable that was being launched, when known. */
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

  /** The executable was not found (resolution included PATH). */
  static notFound(command: string): ShellError {
    return new ShellError("ENOENT", `Command not found: ${command}`, command);
  }

  /** The process could not be spawned (permissions, format, …). */
  static spawnError(command: string, cause: unknown): ShellError {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return new ShellError("ESPAWN", `Failed to spawn ${command}: ${reason}`, command, { cause });
  }

  /** The process exceeded the allowed time and was killed. */
  static timeout(command: string, timeoutMs: number): ShellError {
    return new ShellError(
      "ETIMEDOUT",
      `Command timed out after ${String(timeoutMs)} ms: ${command}`,
      command,
    );
  }

  /** The process was cancelled via AbortSignal and killed. */
  static aborted(command: string): ShellError {
    return new ShellError("EABORTED", `Command aborted: ${command}`, command);
  }

  /** Output exceeded the configured limit and the process was killed. */
  static limit(command: string, maxBytes: number): ShellError {
    return new ShellError(
      "ELIMIT",
      `Command output exceeded ${String(maxBytes)} bytes: ${command}`,
      command,
    );
  }

  /** An argument contains cmd metacharacters (Windows .cmd/.bat launch). */
  static unsafeArg(command: string, argument: string): ShellError {
    return new ShellError(
      "EUNSAFE_ARG",
      `Argument contains shell metacharacters and was rejected: ${JSON.stringify(argument)}`,
      command,
    );
  }

  /** Invalid usage of the API itself (e.g. empty command). */
  static invalid(message: string): ShellError {
    return new ShellError("EINVALID", message, undefined);
  }
}
