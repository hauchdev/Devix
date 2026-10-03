import type { ColorLevel } from "./capabilities.js";
import { Styler } from "./style.js";

/**
 * The Devix colour theme.
 *
 * `Styler` knows how to emit escape codes; this file decides what each
 * *meaning* looks like. Keeping the two apart means the palette can be
 * retuned in one place, and a command never reaches for a raw colour.
 *
 * Every role exists at two fidelities. The 16-colour codes are the ones
 * that survive a basic terminal; the 256-colour codes are the ones worth
 * looking at. Both are chosen to stay legible on light *and* dark
 * backgrounds, because a terminal theme is not ours to assume.
 */

/**
 * A colour for one meaning, at each fidelity the CLI supports.
 *
 * `basic` is a foreground SGR code. Backgrounds are always derived from
 * it by `behind`, so a role never stores two different code families.
 */
export interface ThemeColor {
  /** A standard 16-colour foreground SGR code (30-37 or 90-97). */
  readonly basic: number;
  /** A 256-palette index, for terminals that can show it. */
  readonly rich: number;
}

/** The semantic roles the renderer paints with. */
export interface Theme {
  /** The brand colour: titles, headings, the one thing to look at. */
  readonly primary: ThemeColor;
  /** Secondary brand colour, for structure that should not shout. */
  readonly secondary: ThemeColor;
  /** A healthy result. */
  readonly success: ThemeColor;
  /** Something worth attention. */
  readonly warning: ThemeColor;
  /** A broken or missing thing. */
  readonly danger: ThemeColor;
  /** De-emphasised text: hints, captions, counts. */
  readonly muted: ThemeColor;
  /** Panel and table borders. */
  readonly border: ThemeColor;
  /** The background behind a badge or chip. */
  readonly surface: ThemeColor;
}

/**
 * The Devix palette.
 *
 * `secondary` is a cooler blue than `primary` so the two read as related
 * but distinct; `muted` sits at 244 in the 256 palette, dark enough to
 * recede on white and light enough to stay readable on black.
 *
 * Every `basic` value is a foreground code, because `behind` derives a
 * background by adding ten. That is why `surface` is a mid grey rather
 * than the 100-107 range a reader might reach for: `100` is already a
 * background, and using it as a foreground would emit an invalid code.
 */
export const DEFAULT_THEME: Theme = {
  primary: { basic: 36, rich: 39 },
  secondary: { basic: 94, rich: 75 },
  success: { basic: 32, rich: 78 },
  warning: { basic: 33, rich: 214 },
  danger: { basic: 31, rich: 203 },
  muted: { basic: 90, rich: 244 },
  border: { basic: 90, rich: 240 },
  surface: { basic: 37, rich: 236 },
};

const ESC = "";

function fg(color: ThemeColor, rich: boolean, text: string): string {
  return rich
    ? `${ESC}[38;5;${String(color.rich)}m${text}${ESC}[39m`
    : `${ESC}[${String(color.basic)}m${text}${ESC}[0m`;
}

function bg(color: ThemeColor, rich: boolean, text: string): string {
  return rich
    ? `${ESC}[48;5;${String(color.rich)}m${text}${ESC}[49m`
    : `${ESC}[${String(color.basic + 10)}m${text}${ESC}[0m`;
}

/**
 * A palette bound to a colour level.
 *
 * Every method returns the input untouched when colour is off, so a
 * caller never has to ask whether styling is available.
 */
export class Painter {
  readonly theme: Theme;
  private readonly rich: boolean;
  private readonly on: boolean;

  constructor(level: ColorLevel, theme: Theme = DEFAULT_THEME) {
    this.theme = theme;
    this.on = level !== "none";
    this.rich = level === "enhanced" || level === "truecolor";
  }

  /** True when any colour will be emitted. */
  get enabled(): boolean {
    return this.on;
  }

  /** Backwards-compatible styler, so existing callers keep working. */
  get styler(): Styler {
    return new Styler(this.level);
  }

  private get level(): ColorLevel {
    if (!this.on) {
      return "none";
    }
    return this.rich ? "truecolor" : "basic";
  }

  /** Paints text in a theme role. */
  paint(role: keyof Theme, text: string): string {
    if (!this.on) {
      return text;
    }
    return fg(this.theme[role], this.rich, text);
  }

  /** Paints text on a theme background. */
  behind(role: keyof Theme, text: string): string {
    if (!this.on) {
      return text;
    }
    return bg(this.theme[role], this.rich, text);
  }

  /** Bold text in a theme role. */
  strong(role: keyof Theme, text: string): string {
    return this.on ? `${ESC}[1m${this.paint(role, text)}${ESC}[0m` : text;
  }

  /** Faint text in a theme role. */
  faint(role: keyof Theme, text: string): string {
    return this.on ? `${ESC}[2m${this.paint(role, text)}${ESC}[0m` : text;
  }
}

/** Creates a painter for the given colour level and theme. */
export function createPainter(level: ColorLevel, theme: Theme = DEFAULT_THEME): Painter {
  return new Painter(level, theme);
}
