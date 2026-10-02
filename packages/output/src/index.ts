/**
 * Devix command exit codes.
 *
 * - `Success` (0): the command completed as expected.
 * - `Failure` (1): a user-facing failure (bad input, tool not found,
 *   project validation failed, etc.).
 * - `Unexpected` (2): an internal/programming error or uncaught exception.
 */
export enum ExitCode {
  Success = 0,
  Failure = 1,
  Unexpected = 2,
}

/** A successful command result. */
export interface OkOutput<T> {
  readonly ok: true;
  readonly data: T;
}

/** A failed command result. */
export interface ErrorOutput {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    /** Additional machine-readable context (optional). */
    readonly details?: Record<string, unknown>;
  };
}

/** The canonical shape emitted by every Devix command with `--json`. */
export type CommandOutput<T> = OkOutput<T> | ErrorOutput;

/** Build a successful output object. */
export function ok<T>(data: T): OkOutput<T> {
  return { ok: true, data };
}

/** Build a failed output object. */
export function err(code: string, message: string, details?: Record<string, unknown>): ErrorOutput {
  return { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } };
}

/** Serialize a command output as pretty-printed JSON. */
export function formatJson<T>(output: CommandOutput<T>): string {
  return JSON.stringify(output, null, 2);
}
