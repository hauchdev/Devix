import { Args } from "@oclif/core";

import { DevixCommand, devixBaseFlags } from "../lib/devix-command.js";
import { pluginCommandRegistry } from "../lib/plugin-commands.js";

export default class Docker extends DevixCommand {
  static override description =
    "Docker diagnostics that degrade gracefully when Docker is not installed.";

  static override args = {
    operation: Args.string({
      description: "Docker operation to run.",
      required: true,
      options: ["status", "ps", "images"],
    }),
  };

  static override flags = devixBaseFlags;

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Docker);

    const dockerCommand = await pluginCommandRegistry.load("docker");
    const result = await dockerCommand({ argv: [args.operation], flags });

    if (!result.ok) {
      this.error(result.error.message, { exit: 1 });
    }

    if (flags.json) {
      this.log(JSON.stringify(result.data, null, 2));
      return;
    }

    const ui = this.renderer(flags);
    if (flags.quiet) {
      return;
    }

    ui.title(`devix docker ${args.operation}`);
    ui.blank();
    ui.line(String(result.data));
    ui.blank();
  }
}
