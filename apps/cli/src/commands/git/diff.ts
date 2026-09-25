import { Command, Flags } from "@oclif/core";
import { join } from "node:path";

import { gitErrorHint } from "../../lib/git-errors.js";

export default class GitDiff extends Command {
  static override description =
    "Working-tree diff against HEAD as per-file line counts (read-only).";

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Repository directory. Defaults to the current directory.",
      default: process.cwd(),
    }),
    json: Flags.boolean({
      description: "Output the diff stat as JSON.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(GitDiff);

    const { diffStat } = await import("@devix/git");
    const { GitError } = await import("@devix/git");

    try {
      const result = await diffStat(join(flags.cwd));

      if (flags.json) {
        this.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.entries.length === 0) {
        this.log("No changes against HEAD.");
        return;
      }

      for (const entry of result.entries) {
        const label = entry.binary ? "binary" : `+${entry.additions} -${entry.deletions}`;
        this.log(`  ${label.padEnd(14)} ${entry.path}`);
      }
    } catch (error) {
      this.error(gitErrorHint(error), { exit: 1 });
    }
  }
}
