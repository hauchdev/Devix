/**
 * Symbol sets.
 *
 * Devix renders two visual languages from the same code: a Unicode set
 * for terminals that support it, and a pure-ASCII set for legacy
 * Windows consoles and anywhere box drawing would become mojibake. The
 * ASCII set is chosen to stay legible in a monospace grid rather than to
 * imitate the Unicode shapes exactly.
 */

/** Semantic symbols used by status lines, lists and panels. */
export interface SymbolSet {
  /** A check that passed. */
  readonly success: string;
  /** A check that failed. */
  readonly error: string;
  /** Something worth attention but not broken. */
  readonly warn: string;
  /** Neutral marker. */
  readonly info: string;
  /** List bullet. */
  readonly bullet: string;
  /** Rightwards arrow for hints and next steps. */
  readonly arrow: string;
  /** Horizontal rule. */
  readonly rule: string;
  /** Vertical rule. */
  readonly bar: string;
  /** Top-left corner. */
  readonly topLeft: string;
  /** Top-right corner. */
  readonly topRight: string;
  /** Bottom-left corner. */
  readonly bottomLeft: string;
  /** Bottom-right corner. */
  readonly bottomRight: string;
  /** Tree branch continuation. */
  readonly tee: string;
  /** Tree last branch. */
  readonly elbow: string;
  /** Trailing pipe for an open tree branch. */
  readonly pipe: string;
  /** Three-dot leader for truncated values. */
  readonly ellipsis: string;
  /** Full block, for progress bars. */
  readonly blockFull: string;
  /** Empty cell, for progress bars. */
  readonly blockEmpty: string;
  /** A right-pointing chevron, for collapsed trees and next steps. */
  readonly chevronRight: string;
  /** A down-pointing chevron, for expanded trees. */
  readonly chevronDown: string;
  /** A keyboard key cap, used in usage hints. */
  readonly keyLeft: string;
  /** The right-hand edge of a key cap. */
  readonly keyRight: string;
  /** A filled lozenge, used as a separator dot between metadata. */
  readonly dot: string;
  /** Double horizontal rule, for a heavier separator. */
  readonly doubleRule: string;
}

const UNICODE: SymbolSet = {
  success: "✓",
  error: "✗",
  warn: "▲",
  info: "•",
  bullet: "•",
  arrow: "→",
  rule: "─",
  bar: "│",
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  tee: "├",
  elbow: "└",
  pipe: "│",
  ellipsis: "…",
  blockFull: "█",
  blockEmpty: "░",
  chevronRight: "›",
  chevronDown: "▾",
  keyLeft: "[",
  keyRight: "]",
  dot: "·",
  doubleRule: "═",
};

const ASCII: SymbolSet = {
  success: "v",
  error: "x",
  warn: "!",
  info: "-",
  bullet: "-",
  arrow: "->",
  rule: "-",
  bar: "|",
  topLeft: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomRight: "+",
  tee: "+",
  elbow: "`",
  pipe: "|",
  ellipsis: "...",
  blockFull: "#",
  blockEmpty: ".",
  chevronRight: ">",
  chevronDown: "v",
  keyLeft: "[",
  keyRight: "]",
  dot: "|",
  doubleRule: "=",
};

/** Returns the symbol set for the detected capabilities. */
export function symbolsFor(unicode: boolean): SymbolSet {
  return unicode ? UNICODE : ASCII;
}
