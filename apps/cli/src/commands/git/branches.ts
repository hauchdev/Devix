import { join } from "node:path";

import { DevixCommand, devixBaseFlags } from "../../lib/devix-command.js";
import { gitErrorHint } from "../../lib/git-errors.js";

export default class GitBranches extends DevixCommand {
  static override description = "List local branches, marking the checked-out one (read-only).";

  static override flags = devixBaseFlags;

  async run(): Promise<void> {
    const { flags } = await this.parse(GitBranches);

    const { branches } = await import("@devix-cli/git");

    try {
      const list = await branches(join(flags.cwd));

      if (flags.json) {
        this.log(JSON.stringify(list, null, 2));
        return;
      }

      const ui = this.renderer(flags);
      if (flags.quiet) {
        return;
      }

      ui.title("devix git branches");
      ui.blank();

      if (list.length === 0) {
        ui.fields([{ label: "Branches", value: "none", status: "muted" }]);
        ui.blank();
        return;
      }

      ui.heading("Local branches", { count: list.length });
      ui.table(
        ["BRANCH", "COMMIT"],
        list.map((branch) => ({
          cells: [branch.name, branch.commit.slice(0, 9)],
          ...(branch.current ? { status: "ok" as const } : {}),
        })),
      );
      ui.blank();
    } catch (error) {
      this.error(gitErrorHint(error), { exit: 1 });
    }
  }
}
