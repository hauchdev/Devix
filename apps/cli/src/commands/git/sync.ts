import { join } from "node:path";

import { DevixCommand, devixBaseFlags, field } from "../../lib/devix-command.js";
import { gitErrorHint } from "../../lib/git-errors.js";

export default class GitSync extends DevixCommand {
  static override description =
    "Show how the current branch differs from its upstream. Never runs push or pull: it prints the exact commands for you to run.";

  static override tagline =
    "How this branch differs from its upstream, and the commands to fix it.";

  static override flags = devixBaseFlags;

  async run(): Promise<void> {
    const { flags } = await this.parse(GitSync);

    const { syncState } = await import("@devix-cli/git");
    const { GitError } = await import("@devix-cli/git");

    try {
      const state = await syncState(join(flags.cwd));

      if (flags.json) {
        this.log(JSON.stringify(state, null, 2));
        return;
      }

      const ui = this.renderer(flags);
      if (flags.quiet) {
        return;
      }

      this.header(ui, "devix git sync");

      const synced = state.ahead === 0 && state.behind === 0;

      ui.section("Upstream", (ui) =>
        ui.fields([
          field("Remote", state.upstream),
          field("Ahead", String(state.ahead), state.ahead > 0 ? "warn" : "muted"),
          field("Behind", String(state.behind), state.behind > 0 ? "warn" : "muted"),
        ]),
      );

      if (synced) {
        ui.blank();
        ui.section("State", (ui) => ui.fields([field("In sync with", state.upstream, "ok")]));
        ui.blank();
        return;
      }

      const commands: string[] = [];
      if (state.ahead > 0) {
        commands.push("git push");
      }
      if (state.behind > 0) {
        commands.push("git pull --ff-only");
      }

      ui.blank();
      ui.section(
        "Run these yourself",
        (ui) =>
          ui.fields(
            commands.map((command) => ({ label: "", value: command, status: "warn" as const })),
          ),
        { role: state.ahead > 0 && state.behind > 0 ? "danger" : "warning" },
      );

      if (state.ahead > 0 && state.behind > 0) {
        ui.blank();
        ui.hint("Branch diverged: review with git log --oneline origin/main..HEAD first.");
      }

      ui.blank();
      ui.note("Devix never pushes or pulls on your behalf.");
      ui.blank();
    } catch (error) {
      if (error instanceof GitError && error.code === "EINVALID") {
        this.error("current branch has no upstream to sync with", { exit: 1 });
      }
      this.error(gitErrorHint(error), { exit: 1 });
    }
  }
}
