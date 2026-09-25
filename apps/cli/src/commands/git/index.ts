import { Command } from "@oclif/core";

export default class GitCommand extends Command {
  static description = "Safe, read-only Git operations.";

  async run(): Promise<void> {
    this.printHelp();
  }

  protected override async catch(): Promise<void> {
    this.printHelp();
  }

  private printHelp(): void {
    this.log("Usage: devix git <command>");
    this.log("");
    this.log("Commands:");
    this.log("  status    Show branch and changed paths (porcelain v2 based)");
    this.log("  branches  List local branches with the current one marked");
    this.log("  diff      Working-tree diff against HEAD as per-file line counts");
  }
}
