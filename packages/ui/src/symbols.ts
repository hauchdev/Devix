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
};

/** Returns the symbol set for the detected capabilities. */
export function symbolsFor(unicode: boolean): SymbolSet {
  return unicode ? UNICODE : ASCII;
}
