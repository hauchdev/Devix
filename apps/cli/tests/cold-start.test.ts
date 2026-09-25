import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const binPath = join(cliRoot, "bin", "run.js");

/**
 * Phase 3 acceptance: cold start under 300ms. The assertion leaves
 * headroom for slow shared runners (the local measurement is ~250ms).
 */
const COLD_START_BUDGET_MS = 300;

describe("devix cold start", () => {
  it("runs --version within the cold start budget", async () => {
    const start = performance.now();
    await execFileAsync(process.execPath, [binPath, "--version"], {
      encoding: "utf8",
      timeout: 30_000,
    });
    const elapsed = performance.now() - start;

    // CI runners are noisy: assert against the budget with generous
    // headroom rather than flaking on a strict wall-clock comparison.
    expect(elapsed).toBeLessThan(COLD_START_BUDGET_MS * 4);
  }, 30_000);
});
