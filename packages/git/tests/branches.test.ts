import { describe, expect, it } from "vitest";

import { branches, syncState } from "../src/branches.js";
import { GitError } from "../src/errors.js";
import type { GitCommandOutput, GitRunner } from "../src/runner.js";

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

const revParse = { stdout: "/repo\n", stderr: "" };

describe("branches (fake runner)", () => {
  it("lists branches with the current one marked", async () => {
    const runner = fakeRunner({
      "rev-parse": revParse,
      branch: { stdout: "feature\n", stderr: "" },
      "for-each-ref": {
        stdout:
          "main\t1234567890123456789012345678901234567890\nfeature\tabcdefabcdefabcdefabcdefabcdefabcdefabcd\n",
        stderr: "",
      },
    });

    const list = await branches("/repo", runner);

    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ name: "main", current: false });
    expect(list[1]).toMatchObject({ name: "feature", current: true });
  });
});

describe("syncState (fake runner)", () => {
  it("parses upstream and ahead/behind counts", async () => {
    const runner = fakeRunner({
      "rev-parse": revParse,
      status: {
        stdout: [
          "# branch.oid 1234567890123456789012345678901234567890",
          "# branch.head main",
          "# branch.upstream origin/main",
          "# branch.ab +2 -3",
        ].join("\n"),
        stderr: "",
      },
    });

    const state = await syncState("/repo", runner);

    expect(state).toEqual({ upstream: "origin/main", ahead: 2, behind: 3 });
  });

  it("throws EINVALID when the branch has no upstream", async () => {
    const runner = fakeRunner({
      "rev-parse": revParse,
      status: { stdout: "# branch.head main\n", stderr: "" },
    });

    await expect(syncState("/repo", runner)).rejects.toMatchObject({
      name: "GitError",
      code: "EINVALID",
    });
  });
});
