import { Command, Flags } from "@oclif/core";
import { join } from "node:path";

import { gitErrorHint } from "../../lib/git-errors.js";

export default class GitSync extends Command {
  static override description =
    "Show how the current branch differs from its upstream. Never runs push or pull: it prints the exact commands for you to run.";

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Repository directory. Defaults to the current directory.",
      default: process.cwd(),
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(GitSync);

    const { syncState } = await import("@devix-cli/git");
    const { GitError } = await import("@devix-cli/git");

    try {
      const state = await syncState(join(flags.cwd));

      this.log(`Branch tracks ${state.upstream}.`);
      this.log("");

      if (state.ahead === 0 && state.behind === 0) {
        this.log("Up to date.");
        return;
      }

      if (state.ahead > 0) {
        this.log(`Local commits not pushed: ${state.ahead}`);
        this.log(`  git push`);
      }
      if (state.behind > 0) {
        this.log(`Upstream commits not pulled: ${state.behind}`);
        this.log(`  git pull --ff-only`);
      }
      if (state.ahead > 0 && state.behind > 0) {
        this.log("");
        this.log("Branch diverged: review with git log --oneline origin/main..HEAD first.");
      }
    } catch (error) {
      if (error instanceof GitError && error.code === "EINVALID") {
        this.error("current branch has no upstream to sync with", { exit: 1 });
      }
      this.error(gitErrorHint(error), { exit: 1 });
    }
  }
}
