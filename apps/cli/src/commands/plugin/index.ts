import { Command } from "@oclif/core";

export default class PluginCommand extends Command {
  static description = "Manage Devix plugins.";

  async run(): Promise<void> {
    this.printHelp();
  }

  protected override async catch(): Promise<void> {
    this.printHelp();
  }

  private printHelp(): void {
    this.log("Usage: devix plugin <command>");
    this.log("");
    this.log("Commands:");
    this.log("  list  List installed plugins");
  }
}
