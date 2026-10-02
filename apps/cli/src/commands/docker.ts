import { Args, Command, Flags } from "@oclif/core";
import { join } from "node:path";

import { pluginCommandRegistry } from "../lib/plugin-commands.js";

export default class Docker extends Command {
  static override description =
    "Docker diagnostics that degrade gracefully when Docker is not installed.";

  static override args = {
    operation: Args.string({
      description: "Docker operation to run.",
      required: true,
      options: ["status", "ps", "images"],
    }),
  };

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Project directory (reserved for compose detection). Defaults to cwd.",
      default: async () => process.cwd(),
    }),
    json: Flags.boolean({
      description: "Output as JSON.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Docker);
    void join(flags.cwd);

    const handler = await pluginCommandRegistry.load("docker");
    const result = await handler({ argv: [args.operation], flags });

    if (result.ok) {
      if (flags.json) {
        this.log(JSON.stringify(result.data, null, 2));
      } else {
        this.log(String(result.data));
      }
      return;
    }

    this.error(result.error.message, { exit: 1 });
  }
}
