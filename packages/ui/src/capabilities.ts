/**
 * Terminal capability detection.
 *
 * Every visual decision in Devix flows from here: which colors are safe,
 * whether box-drawing characters will render, and how wide the output
 * may be. Detection never throws and never assumes a terminal exists —
 * a piped stream must degrade to plain, ASCII-only text.
 */

/** How much color the terminal can render. */
export type ColorLevel =
  /** No ANSI escapes at all. */
  | "none"
  /** The 16 base colors. */
  | "basic"
  /** 256-color palette. */
  | "enhanced"
  /** 24-bit truecolor. */
  | "truecolor";

/** The minimum environment needed to make a decision. */
export interface TerminalEnv {
  readonly [key: string]: string | undefined;
}

/** Inputs to capability detection. */
export interface CapabilityOptions {
  /** Environment variables. Defaults to `process.env`. */
  readonly env?: TerminalEnv;
  /** Whether the stream is an interactive terminal. */
  readonly isTty?: boolean;
  /** Stream width in columns, when known. */
  readonly columns?: number;
  /** Platform. Defaults to `process.platform`. */
  readonly platform?: string;
}

/** What the renderer is allowed to do. */
export interface Capabilities {
  readonly color: ColorLevel;
  /** True when the terminal renders Unicode box drawing and symbols. */
  readonly unicode: boolean;
  /** Usable width in columns, clamped to a readable range. */
  readonly width: number;
  /** True when the output is an interactive terminal. */
  readonly interactive: boolean;
}

/** Narrower than this and layouts become unreadable. */
export const MIN_WIDTH = 32;

/** Wider than this and lines get hard to scan. */
export const MAX_WIDTH = 100;

/** Used when the stream width is unknown (pipes, CI, redirected output). */
export const FALLBACK_WIDTH = 80;

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

/**
 * Resolves the color level.
 *
 * Precedence follows the informal conventions terminal tools agree on:
 * an explicit `FORCE_COLOR` wins over everything, then `NO_COLOR`, then
 * whether we are attached to a terminal at all.
 */
export function detectColor(options: CapabilityOptions): ColorLevel {
  const env = options.env ?? process.env;
  const force = env["FORCE_COLOR"];

  // An explicit FORCE_COLOR always decides the outcome, including the
  // "off" values: a user who sets FORCE_COLOR=0 is asking for no color
  // even on a terminal that supports it.
  if (force !== undefined && force !== "") {
    const normalized = force.trim().toLowerCase();
    if (normalized === "0" || normalized === "false" || normalized === "none") {
      return "none";
    }
    if (normalized === "1" || normalized === "true" || normalized === "basic") {
      return "basic";
    }
    if (normalized === "2") {
      return "enhanced";
    }
    return "truecolor";
  }

  if (env["NO_COLOR"] !== undefined && env["NO_COLOR"] !== "") {
    return "none";
  }

  if (options.isTty !== true) {
    return "none";
  }

  if (env["TERM"] === "dumb") {
    return "none";
  }

  const colorterm = (env["COLORTERM"] ?? "").toLowerCase();
  if (colorterm === "truecolor" || colorterm === "24bit") {
    return "truecolor";
  }

  const term = (env["TERM"] ?? "").toLowerCase();
  if (term.includes("256color")) {
    return "enhanced";
  }

  return "basic";
}

/**
 * Resolves whether Unicode box drawing is safe.
 *
 * Windows consoles still default to legacy code pages, where `─` and `✓`
 * turn into mojibake. Modern Windows Terminal and the common emulators
 * declare themselves through the environment; everywhere else the locale
 * decides.
 */
export function detectUnicode(options: CapabilityOptions): boolean {
  const env = options.env ?? process.env;
  const override = env["DEVIX_UNICODE"];

  if (override === "1" || override === "true") {
    return true;
  }
  if (override === "0" || override === "false") {
    return false;
  }

  const platform = options.platform ?? process.platform;

  if (platform === "win32") {
    if (!isBlank(env["WT_SESSION"])) {
      return true;
    }
    if (env["ConEmuANSI"] === "ON") {
      return true;
    }
    const program = (env["TERM_PROGRAM"] ?? "").toLowerCase();
    if (["vscode", "hyper", "apple_terminal", "terminus", "wezterm", "tabby"].includes(program)) {
      return true;
    }
    // Windows Terminal with a UTF-8 code page.
    if ((env["CHCP"] ?? "").startsWith("65001")) {
      return true;
    }
    return false;
  }

  const locale = [env["LC_ALL"], env["LC_CTYPE"], env["LANG"]]
    .filter((value): value is string => !isBlank(value))
    .join(" ");

  if (locale.length === 0) {
    // Modern terminals on macOS and Linux are UTF-8 by default.
    return true;
  }

  return /utf-?8/i.test(locale);
}

/** Clamps a measured width into the range layouts are designed for. */
export function resolveWidth(options: CapabilityOptions): number {
  const measured = options.columns;

  if (measured === undefined || !Number.isFinite(measured) || measured <= 0) {
    return FALLBACK_WIDTH;
  }

  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.floor(measured)));
}

/** Detects every capability at once. */
export function detectCapabilities(options: CapabilityOptions = {}): Capabilities {
  return {
    color: detectColor(options),
    unicode: detectUnicode(options),
    width: resolveWidth(options),
    interactive: options.isTty === true,
  };
}
