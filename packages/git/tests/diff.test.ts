import { describe, expect, it } from "vitest";

import { diffStat } from "../src/diff.js";
import type { GitRunner } from "../src/types.js";

/** A runner that answers `rev-parse` and replays a scripted `--numstat`. */
function runnerFor(numstat: string): GitRunner {
  return {
    async run(
      args: readonly string[],
    ): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
      if (args[0] === "rev-parse") {
        return { exitCode: 0, stdout: "/repo\n", stderr: "" };
      }
      return { exitCode: 0, stdout: numstat, stderr: "" };
    },
  };
}

describe("diffStat parsing", () => {
  it("counts additions and deletions", async () => {
    const result = await diffStat("/repo", runnerFor("3\t1\tsrc/index.ts\n"));

    expect(result.entries).toEqual([
      { path: "src/index.ts", additions: 3, deletions: 1, binary: false },
    ]);
  });

  it("marks a binary file and reports zero counts", async () => {
    // git prints "-\t-\t<path>" for files it cannot diff line by line.
    const result = await diffStat("/repo", runnerFor("-\t-\tlogo.png\n"));

    expect(result.entries).toEqual([
      { path: "logo.png", additions: 0, deletions: 0, binary: true },
    ]);
  });

  it("skips blank lines", async () => {
    const result = await diffStat("/repo", runnerFor("\n1\t0\ta.ts\n\n"));

    expect(result.entries).toHaveLength(1);
  });

  it("skips a row with no path column", async () => {
    const result = await diffStat("/repo", runnerFor("1\t0\n"));

    expect(result.entries).toEqual([]);
  });

  it("returns nothing for a clean tree", async () => {
    expect((await diffStat("/repo", runnerFor(""))).entries).toEqual([]);
  });

  it("treats a missing count column as zero", async () => {
    const result = await diffStat("/repo", runnerFor("\t\tonly-path.txt\n"));

    expect(result.entries).toEqual([
      { path: "only-path.txt", additions: 0, deletions: 0, binary: false },
    ]);
  });

  it("handles several files in one run", async () => {
    const result = await diffStat("/repo", runnerFor("1\t2\ta.ts\n3\t4\tb.ts\n5\t6\tc.ts\n"));

    expect(result.entries.map((entry) => entry.path)).toEqual(["a.ts", "b.ts", "c.ts"]);
  });
});
