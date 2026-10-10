import { err, formatJson, ok, type CommandOutput, type ErrorOutput } from "@devix-cli/output";
import { Command, Flags } from "@oclif/core";
import { createUi, type Field, type Row, type Status, type Ui } from "@devix-cli/ui";

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

/**
 * Shared flag for commands that inspect a directory.
 *
 * By default detection walks up to find the project root, which is what
 * you want inside a subdirectory of a project. `--here` pins the
 * inspection to exactly the given directory instead, which is what you
 * want in a directory that merely happens to sit under one.
 */
export const hereFlag = Flags.boolean({
  description: "Inspect exactly this directory, without searching parent directories.",
  default: false,
});

/** Shape of the common Devix flags after parsing. */
export interface DevixBaseFlags {
  readonly json: boolean;
  readonly cwd: string;
  readonly "no-color": boolean;
  readonly quiet: boolean;
  readonly verbose: boolean;
  readonly config?: string;
}

/** Options used to build the renderer. */
export interface RendererOptions {
  /** Disables color regardless of detection. */
  readonly color?: boolean;
  /** Overrides the detected width. */
  readonly width?: number;
  /** Captures output instead of writing to stdout. */
  readonly write?: (text: string) => void;
}

/**
 * Base class for Devix commands.
 *
 * Owns two responsibilities so individual commands do not repeat them:
 * the canonical JSON envelope, and terminal rendering. Commands decide
 * *what* to show; this class decides *how*.
 */
export abstract class DevixCommand extends Command {
  static override baseFlags = devixBaseFlags;

  /**
   * A one-line purpose shown under the command name.
   *
   * Defaults to the command's `description`, which is written for
   * `--help` and is often a full sentence. A command whose description
   * does not fit one line sets this instead, so every report's header is
   * the same shape.
   */
  static tagline: string | undefined;

  private cachedUi: Ui | undefined;

  /**
   * The renderer for this invocation.
   *
   * Cached per command instance so a command that renders several
   * sections does not re-detect capabilities each time.
   */
  protected ui(options: RendererOptions = {}): Ui {
    if (this.cachedUi === undefined || options.width !== undefined || options.write !== undefined) {
      this.cachedUi = createUi({
        ...(options.color === false ? { color: "none" as const } : {}),
        ...(options.width === undefined ? {} : { width: options.width }),
        ...(options.write === undefined ? {} : { write: options.write }),
      });
    }
    return this.cachedUi;
  }

  /** The renderer configured from parsed flags. */
  protected renderer(flags: DevixBaseFlags, options: RendererOptions = {}): Ui {
    return this.ui({
      ...(flags["no-color"] ? { color: false as const } : {}),
      ...options,
    });
  }

  /**
   * The header every report opens with.
   *
   * The landing panel's banner, reused: name, one line of purpose, a
   * full-width rule, then a blank line. A command that renders a report
   * calls this instead of `title`, so `devix status` and `devix` start
   * the same way.
   */
  protected header(ui: Ui, name: string): void {
    const ctor = this.constructor as typeof DevixCommand;
    reportHeader(ui, name, ctor.tagline ?? ctor.description ?? "");
  }

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

    this.renderer(flags).lines(plainText(data));
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

/**
 * Draws the standard report header.
 *
 * Exported for the renderers that are plain functions rather than
 * commands — the minecraft and web reports — so they open exactly the
 * way a command does.
 */
export function reportHeader(ui: Ui, name: string, tagline: string): void {
  ui.deck.banner(name, tagline);
  ui.blank();
}

/** Maps a service status onto a renderer status. */
export function toUiStatus(status: string): Status {
  switch (status) {
    case "ok":
      return "ok";
    case "warn":
      return "warn";
    case "error":
    case "missing":
      return "error";
    case "muted":
      return "muted";
    default:
      return "info";
  }
}

/** Builds a field row without repeating the shape everywhere. */
export function field(label: string, value?: string, status?: Status, hint?: string): Field {
  return {
    label,
    ...(value === undefined ? {} : { value }),
    ...(status === undefined ? {} : { status }),
    ...(hint === undefined ? {} : { hint }),
  };
}

/**
 * Maps a doctor check onto a field.
 *
 * A missing tool with no version reads as "not found" rather than an em
 * dash: "missing" is the fact worth stating, and a dash makes the reader
 * guess whether it is missing or merely unreported.
 */
export function checkField(check: {
  readonly name: string;
  readonly status: string;
  readonly detail?: string;
}): Field {
  const value =
    check.detail ??
    (check.status === "missing" ? "not found" : check.status === "warn" ? "unknown" : undefined);
  return field(check.name, value, toUiStatus(check.status));
}

/** Builds a table row without repeating the shape everywhere. */
export function row(cells: readonly string[], status?: Status): Row {
  return { cells, ...(status === undefined ? {} : { status }) };
}
