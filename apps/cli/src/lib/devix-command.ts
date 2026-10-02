import { err, formatJson, ok, type CommandOutput, type ErrorOutput } from "@devix-cli/output";
import { Command, Flags } from "@oclif/core";

/** Common Devix command flags. */
export const devixBaseFlags = {
  json: Flags.boolean({
    description: "Output as JSON.",
    default: false,
  }),
  cwd: Flags.string({
    char: "d",
    description: "Working directory. Defaults to the current directory.",
    default: async () => process.cwd(),
  }),
  "no-color": Flags.boolean({
    description: "Disable colored output.",
    default: false,
  }),
  quiet: Flags.boolean({
    char: "q",
    description: "Suppress non-error output.",
    default: false,
  }),
  verbose: Flags.boolean({
    char: "v",
    description: "Print extra diagnostics.",
    default: false,
  }),
  config: Flags.string({
    description: "Path to a Devix config file.",
    default: undefined,
  }),
};

/** Shape of the common Devix flags after parsing. */
export interface DevixBaseFlags {
  readonly json: boolean;
  readonly cwd: string;
  readonly "no-color": boolean;
  readonly quiet: boolean;
  readonly verbose: boolean;
  readonly config?: string;
}

/** Base class for Devix commands. */
export abstract class DevixCommand extends Command {
  static override baseFlags = devixBaseFlags;

  /**
   * Print a successful result. With `--json` the canonical output shape
   * is emitted; otherwise the plain-text formatter is used.
   */
  protected printOk<T>(flags: DevixBaseFlags, data: T, plainText: (data: T) => string[]): void {
    if (flags.json) {
      this.log(formatJson(ok(data)));
      return;
    }

    if (flags.quiet) {
      return;
    }

    for (const line of plainText(data)) {
      this.log(line);
    }
  }

  /** Print an error using the canonical output shape. */
  protected printError(flags: DevixBaseFlags, output: ErrorOutput): void {
    if (flags.json) {
      this.log(formatJson(output));
      return;
    }

    this.error(output.error.message, { exit: 1 });
  }

  /**
   * Helper for commands that return either data or an error. Prints the
   * appropriate output and exits with the right code.
   */
  protected printResult<T>(
    flags: DevixBaseFlags,
    result: CommandOutput<T>,
    plainText: (data: T) => string[],
  ): void {
    if (result.ok) {
      this.printOk(flags, result.data, plainText);
      return;
    }

    this.printError(flags, result);
  }

  /** Build an error output object for this command. */
  protected makeError(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): ErrorOutput {
    return err(code, message, details);
  }
}
