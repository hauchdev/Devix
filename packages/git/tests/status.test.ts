import { describe, expect, it } from "vitest";

import { GitError } from "../src/errors.js";
import { status } from "../src/status.js";
import type { GitCommandOutput, GitRunner } from "../src/runner.js";

/** Runner replaying canned outputs per first argument. */
function fakeRunner(outputs: Record<string, GitCommandOutput>): GitRunner {
  return {
    async run(args) {
      const key = args[0] ?? "";
      const output = outputs[key];
      if (output === undefined) {
        throw GitError.commandFailed(key, 1, "unexpected command in fake runner");
      }
      return output;
    },
  };
}

import { resolve } from "node:path";

/** repositoryRoot resolves the printed path through node:path. */
const repoRoot = resolve("/repo");
const revParse = { stdout: "/repo\n", stderr: "" };

describe("status (porcelain v2 parsing)", () => {
  it("parses modified, added and untracked entries with branch info", async () => {
    const runner = fakeRunner({
      "rev-parse": revParse,
      status: {
        stdout: [
          "# branch.oid 1234567890abcdef1234567890abcdef12345678",
          "# branch.head main",
          "1 .M N... 100644 100644 100644 abc def src/index.ts",
          "1 A. N... 000000 100644 100644 000 111 new-file.ts",
          "? notes.log",
        ].join("\n"),
        stderr: "",
      },
    });

    const result = await status("/repo", runner);

    expect(result.root).toBe(repoRoot);
    expect(result.branch).toBe("main");
    expect(result.hasCommits).toBe(true);
    expect(result.entries).toHaveLength(3);

    const [modified, added, untracked] = result.entries;
    expect(modified?.path).toBe("src/index.ts");
    expect(modified?.index).toBe("other");
    expect(modified?.workingTree).toBe("modified");
    expect(added?.index).toBe("added");
    expect(added?.workingTree).toBe("other");
    expect(untracked?.path).toBe("notes.log");
    expect(untracked?.index).toBe("untracked");
    expect(untracked?.conflicted).toBe(false);
  });

  it("reports detached HEAD as no branch", async () => {
    const runner = fakeRunner({
      "rev-parse": revParse,
      status: { stdout: "# branch.head (detached)\n", stderr: "" },
    });

    const result = await status("/repo", runner);

    expect(result.branch).toBeUndefined();
    expect(result.entries).toEqual([]);
  });

  it("marks an initial repository as having no commits", async () => {
    const runner = fakeRunner({
      "rev-parse": revParse,
      status: {
        stdout: "# branch.oid (initial)\n# branch.head main\n",
        stderr: "",
      },
    });

    const result = await status("/repo", runner);

    expect(result.hasCommits).toBe(false);
    expect(result.branch).toBe("main");
  });

  it("parses conflicted entries", async () => {
    const runner = fakeRunner({
      "rev-parse": revParse,
      status: {
        stdout: [
          "# branch.head main",
          "u UU N... 000000 000000 000000 000 000 000 conflicted.txt",
        ].join("\n"),
        stderr: "",
      },
    });

    const result = await status("/repo", runner);

    const [entry] = result.entries;
    expect(entry?.conflicted).toBe(true);
    expect(entry?.index).toBe("conflicted");
    expect(entry?.workingTree).toBe("conflicted");
    expect(entry?.path).toBe("conflicted.txt");
  });

  it("marks rename entries via the to-path", async () => {
    const runner = fakeRunner({
      "rev-parse": revParse,
      status: {
        // Real git shape: "2 ... R100 <toPath>\t<fromPath>".
        stdout: [
          "# branch.head main",
          "2 R. N... 100644 100644 100644 abc abc R100 new.txt\told.txt",
        ].join("\n"),
        stderr: "",
      },
    });

    const result = await status("/repo", runner);

    const [entry] = result.entries;
    expect(entry?.path).toBe("new.txt");
    expect(entry?.index).toBe("renamed");
    expect(entry?.workingTree).toBe("other");
  });

  it("handles paths containing spaces", async () => {
    const runner = fakeRunner({
      "rev-parse": revParse,
      status: {
        stdout: [
          "# branch.head main",
          "1 .M N... 100644 100644 100644 abc def my file with spaces.txt",
        ].join("\n"),
        stderr: "",
      },
    });

    const result = await status("/repo", runner);

    expect(result.entries[0]?.path).toBe("my file with spaces.txt");
  });
});
