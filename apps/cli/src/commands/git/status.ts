import { Command, Flags } from "@oclif/core";
import { join } from "node:path";

export default class GitStatus extends Command {
  static override description =
    "Show the current branch and changed paths of the repository (read-only).";

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Repository directory. Defaults to the current directory.",
      default: process.cwd(),
    }),
    json: Flags.boolean({
      description: "Output the status as JSON.",
      default: false,
    }),
  };

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

      this.log(result.branch === undefined ? "HEAD detached" : `Branch: ${result.branch}`);
      if (!result.hasCommits) {
        this.log("(no commits yet)");
      }
      if (result.entries.length === 0) {
        this.log("Working tree clean.");
        return;
      }
      this.log("");
      for (const entry of result.entries) {
        const index = shortCode(entry.index);
        const tree = shortCode(entry.workingTree);
        this.log(`  ${index}${tree} ${entry.path}${entry.conflicted ? " (conflict)" : ""}`);
      }
    } catch (error) {
      if (error instanceof GitError && error.code === "EGIT_NOT_A_REPO") {
        this.error("not a git repository", { exit: 1 });
      }
      if (error instanceof GitError && error.code === "EGIT_NOT_FOUND") {
        this.error("git executable not found on PATH", { exit: 1 });
      }
      throw error;
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
