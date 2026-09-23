import { afterEach, describe, expect, it, vi } from "vitest";

import { log } from "../src/index.js";

describe("@devix/logger", () => {
  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  afterEach(() => {
    consoleSpy.mockClear();
  });

  it("writes the message to the console", () => {
    log("hello");

    expect(consoleSpy).toHaveBeenCalledExactlyOnceWith("hello");
  });
});
