import type { ColorLevel } from "./capabilities.js";

/**
 * ANSI helpers.
 *
 * Written by hand rather than pulled from a library: Devix needs exactly
 * these sequences, and a dependency for a handful of escape codes is not
 * a trade worth making. Every function returns the input untouched when
 * styling is disabled, so callers never have to branch.
 */

const ESC = "\u001B";

function sgr(params: string): string {
  return `${ESC}[${params}m`;
}

function styled(params: string, text: string): string {
  return `${sgr(params)}${text}${sgr("0")}`;
}

/** Styles text according to the detected color level. */
export class Styler {
  private readonly level: ColorLevel;

  constructor(level: ColorLevel) {
    this.level = level;
  }

  /** True when any styling is applied at all. */
  get enabled(): boolean {
    return this.level !== "none";
  }

  /** True when the 256-color palette is available. */
  get rich(): boolean {
    return this.level === "enhanced" || this.level === "truecolor";
  }

  private fg(basicCode: number, richCode: number, text: string): string {
    if (!this.enabled) {
      return text;
    }
    return this.rich
      ? `${sgr(`38;5;${richCode}`)}${text}${sgr("39")}`
      : styled(String(basicCode), text);
  }

  bold(text: string): string {
    return this.enabled ? styled("1", text) : text;
  }

  dim(text: string): string {
    return this.enabled ? styled("2", text) : text;
  }

  italic(text: string): string {
    return this.enabled ? styled("3", text) : text;
  }

  underline(text: string): string {
    return this.enabled ? styled("4", text) : text;
  }

  /** The signature accent used for titles and highlights. */
  accent(text: string): string {
    return this.fg(36, 111, text);
  }

  success(text: string): string {
    return this.fg(32, 78, text);
  }

  warn(text: string): string {
    return this.fg(33, 215, text);
  }

  error(text: string): string {
    return this.fg(31, 203, text);
  }

  /** Secondary information: help text, hints, counts. */
  muted(text: string): string {
    return this.fg(90, 245, text);
  }
}

/**
 * Matches ANSI SGR sequences so width math can ignore them.
 *
 * Built with the RegExp constructor so the pattern holds no control
 * character, keeping `no-control-regex` satisfied without a suppression.
 */
const ANSI_PATTERN = new RegExp(`${ESC}\\[[0-9;]*m`, "g");

/** Number of visible columns in a string, ignoring ANSI sequences. */
export function visibleWidth(text: string): number {
  return text.replace(ANSI_PATTERN, "").length;
}

/** Pads a styled string to `width` visible columns. */
export function padEndVisible(text: string, width: number): string {
  const padding = width - visibleWidth(text);
  return padding > 0 ? `${text}${" ".repeat(padding)}` : text;
}

/** Pads a styled string to `width` visible columns, aligning to the right. */
export function padStartVisible(text: string, width: number): string {
  const padding = width - visibleWidth(text);
  return padding > 0 ? `${" ".repeat(padding)}${text}` : text;
}

/**
 * Truncates to `width` visible columns, appending an ellipsis when cut.
 *
 * The ellipsis is a parameter because the ASCII symbol set must stay
 * printable ASCII: a hardcoded `…` would render as mojibake on a legacy
 * console, which is the exact failure the set exists to prevent.
 */
export function truncateVisible(text: string, width: number, ellipsis = "…"): string {
  if (visibleWidth(text) <= width) {
    return text;
  }
  if (width <= ellipsis.length) {
    // No room for the marker: a plain cut is better than a longer string.
    return text.slice(0, Math.max(0, width));
  }
  return `${text.slice(0, width - ellipsis.length)}${ellipsis}`;
}

/**
 * Wraps plain text to `width` visible columns.
 *
 * Only for unstyled prose — a hint, a note. Wrapping counts visible
 * columns, so it would miscount if the text carried ANSI sequences;
 * style each wrapped line afterwards if colour is needed.
 */
export function wrapVisible(text: string, width: number): string[] {
  if (width < 1) {
    return [text];
  }

  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter((part) => part.length > 0)) {
      if (current.length === 0) {
        current = word;
        continue;
      }
      if (current.length + 1 + word.length <= width) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return lines;
}
