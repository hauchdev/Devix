import { join } from "node:path";

import { DevixCommand, devixBaseFlags } from "../../lib/devix-command.js";
import { gitErrorHint } from "../../lib/git-errors.js";

export default class GitStatus extends DevixCommand {
  static override description =
    "Show the current branch and changed paths of the repository (read-only).";

  static override flags = devixBaseFlags;

  async run(): Promise<void> {
    const { flags } = await this.parse(GitStatus);

    const { status } = await import("@devix-cli/git");
    const { GitError } = await import("@devix-cli/git");

    try {
      const result = await status(join(flags.cwd));

      if (flags.json) {
        this.log(JSON.stringify(result, null, 2));
        return;
      }

      const ui = this.renderer(flags);
      if (flags.quiet) {
        return;
      }

      this.header(ui, "devix git status");
      ui.section("Repository", (ui) => {
        ui.fields([
          { label: "Branch", value: result.branch ?? "HEAD detached" },
          ...(result.hasCommits
            ? []
            : [{ label: "Commits", value: "none yet", status: "warn" as const }]),
          { label: "Changes", value: String(result.entries.length) },
        ]);
      });

      if (result.entries.length === 0) {
        ui.blank();
        ui.section("Working tree", (ui) =>
          ui.fields([{ label: "State", value: "clean", status: "ok" }]),
        );
        ui.blank();
        return;
      }

      ui.blank();
      ui.section(
        "Changed files",
        (ui) =>
          ui.table(
            ["ST", "PATH", "STATE"],
            result.entries.map((entry) => ({
              cells: [
                `${shortCode(entry.index)}${shortCode(entry.workingTree)}`,
                entry.path,
                entry.conflicted ? "conflict" : "changed",
              ],
              status: (entry.conflicted ? "error" : "warn") as "error" | "warn",
            })),
          ),
        { count: result.entries.length },
      );
      ui.blank();
    } catch (error) {
      if (error instanceof GitError && error.code === "EGIT_NOT_A_REPO") {
        this.error("not a git repository", { exit: 1 });
      }
      if (error instanceof GitError && error.code === "EGIT_NOT_FOUND") {
        this.error("git executable not found on PATH", { exit: 1 });
      }
      this.error(gitErrorHint(error), { exit: 1 });
    }
  }
}

/** Two-character short code like git's porcelain v1. */
function shortCode(code: string): string {
  switch (code) {
    case "added":
      return "A";
    case "modified":
      return "M";
    case "deleted":
      return "D";
    case "renamed":
      return "R";
    case "copied":
      return "C";
    case "untracked":
      return "?";
    case "conflicted":
      return "U";
    case "typechange":
      return "T";
    default:
      return ".";
  }
}
