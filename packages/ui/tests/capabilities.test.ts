import { describe, expect, it } from "vitest";

import {
  detectCapabilities,
  detectColor,
  detectUnicode,
  resolveWidth,
  FALLBACK_WIDTH,
  MAX_WIDTH,
  MIN_WIDTH,
} from "../src/index.js";

const UTF8_LOCALE = { LANG: "en_US.UTF-8" } as const;

describe("detectColor", () => {
  it("returns none when the stream is not a terminal", () => {
    expect(detectColor({ env: {}, isTty: false })).toBe("none");
  });

  it("returns basic for a plain terminal", () => {
    expect(detectColor({ env: { TERM: "xterm" }, isTty: true })).toBe("basic");
  });

  it("returns enhanced for a 256-color terminal", () => {
    expect(detectColor({ env: { TERM: "xterm-256color" }, isTty: true })).toBe("enhanced");
  });

  it("returns truecolor when COLORTERM says so", () => {
    expect(detectColor({ env: { TERM: "xterm", COLORTERM: "truecolor" }, isTty: true })).toBe(
      "truecolor",
    );
  });

  it("returns none for TERM=dumb", () => {
    expect(detectColor({ env: { TERM: "dumb" }, isTty: true })).toBe("none");
  });

  it("honors NO_COLOR over everything except FORCE_COLOR", () => {
    expect(detectColor({ env: { NO_COLOR: "1", TERM: "xterm-256color" }, isTty: true })).toBe(
      "none",
    );
    expect(detectColor({ env: { NO_COLOR: "1", FORCE_COLOR: "2" }, isTty: false })).toBe(
      "enhanced",
    );
  });

  it("treats an empty NO_COLOR as unset", () => {
    expect(detectColor({ env: { NO_COLOR: "", TERM: "xterm" }, isTty: true })).toBe("basic");
  });

  it("lets FORCE_COLOR win over a non-tty", () => {
    expect(detectColor({ env: { FORCE_COLOR: "1" }, isTty: false })).toBe("basic");
    expect(detectColor({ env: { FORCE_COLOR: "3" }, isTty: false })).toBe("truecolor");
  });

  it("turns color off for FORCE_COLOR=0 and false", () => {
    expect(detectColor({ env: { FORCE_COLOR: "0", TERM: "xterm" }, isTty: true })).toBe("none");
    expect(detectColor({ env: { FORCE_COLOR: "false", TERM: "xterm" }, isTty: true })).toBe("none");
  });
});

describe("detectUnicode", () => {
  it("is true on a UTF-8 locale", () => {
    expect(detectUnicode({ env: UTF8_LOCALE, platform: "linux" })).toBe(true);
  });

  it("is false on a legacy locale", () => {
    expect(detectUnicode({ env: { LANG: "en_US.ISO-8859-1" }, platform: "linux" })).toBe(false);
  });

  it("reads LC_ALL and LC_CTYPE too", () => {
    expect(detectUnicode({ env: { LC_ALL: "C.UTF-8" }, platform: "linux" })).toBe(true);
    expect(detectUnicode({ env: { LC_CTYPE: "en_US.UTF-8" }, platform: "linux" })).toBe(true);
  });

  it("defaults to true on a unix host with no locale set", () => {
    expect(detectUnicode({ env: {}, platform: "darwin" })).toBe(true);
  });

  it("is false on a legacy Windows console", () => {
    expect(detectUnicode({ env: {}, platform: "win32" })).toBe(false);
  });

  it("is true on Windows Terminal", () => {
    expect(detectUnicode({ env: { WT_SESSION: "abc" }, platform: "win32" })).toBe(true);
  });

  it("is true in known Windows emulators", () => {
    for (const program of ["vscode", "Hyper", "WezTerm", "Apple_Terminal"]) {
      expect(detectUnicode({ env: { TERM_PROGRAM: program }, platform: "win32" })).toBe(true);
    }
  });

  it("is true on Windows with a UTF-8 code page or ConEmu", () => {
    expect(detectUnicode({ env: { CHCP: "65001" }, platform: "win32" })).toBe(true);
    expect(detectUnicode({ env: { ConEmuANSI: "ON" }, platform: "win32" })).toBe(true);
  });

  it("is true on Windows even with a legacy locale variable", () => {
    expect(detectUnicode({ env: { WT_SESSION: "x", LANG: "C" }, platform: "win32" })).toBe(true);
  });

  it("honors an explicit override", () => {
    expect(detectUnicode({ env: { DEVIX_UNICODE: "1" }, platform: "win32" })).toBe(true);
    expect(detectUnicode({ env: { DEVIX_UNICODE: "0" }, platform: "linux" })).toBe(false);
  });
});

describe("resolveWidth", () => {
  it("falls back when the width is unknown", () => {
    expect(resolveWidth({})).toBe(FALLBACK_WIDTH);
    expect(resolveWidth({ columns: 0 })).toBe(FALLBACK_WIDTH);
    expect(resolveWidth({ columns: Number.NaN })).toBe(FALLBACK_WIDTH);
  });

  it("clamps to the readable range", () => {
    expect(resolveWidth({ columns: 10 })).toBe(MIN_WIDTH);
    expect(resolveWidth({ columns: 300 })).toBe(MAX_WIDTH);
    expect(resolveWidth({ columns: 80 })).toBe(80);
  });

  it("floors fractional widths", () => {
    expect(resolveWidth({ columns: 79.9 })).toBe(79);
  });
});

describe("detectCapabilities", () => {
  it("reports every capability together", () => {
    const capabilities = detectCapabilities({
      env: { TERM: "xterm-256color", LANG: "en_US.UTF-8" },
      isTty: true,
      columns: 120,
      platform: "linux",
    });

    expect(capabilities).toEqual({
      color: "enhanced",
      unicode: true,
      width: MAX_WIDTH,
      interactive: true,
    });
  });

  it("degrades fully for a piped stream on legacy Windows", () => {
    const capabilities = detectCapabilities({
      env: {},
      isTty: false,
      platform: "win32",
    });

    expect(capabilities).toEqual({
      color: "none",
      unicode: false,
      width: FALLBACK_WIDTH,
      interactive: false,
    });
  });
});
