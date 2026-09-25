import { Command, Flags } from "@oclif/core";
import { join } from "node:path";

import { gitErrorHint } from "../../lib/git-errors.js";

export default class GitBranches extends Command {
  static override description = "List local branches, marking the checked-out one (read-only).";

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Repository directory. Defaults to the current directory.",
      default: process.cwd(),
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(GitBranches);

    const { branches } = await import("@devix-cli/git");

    try {
      const list = await branches(join(flags.cwd));

      for (const branch of list) {
        this.log(`${branch.current ? "* " : "  "}${branch.name} ${branch.commit.slice(0, 9)}`);
      }
    } catch (error) {
      this.error(gitErrorHint(error), { exit: 1 });
    }
  }
}
