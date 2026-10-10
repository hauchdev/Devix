import { Args } from "@oclif/core";
import { join } from "node:path";

import { DevixCommand, devixBaseFlags, field } from "../lib/devix-command.js";

export default class Deps extends DevixCommand {
  static override description =
    "Run read-only dependency commands through the detected package manager.";

  static override args = {
    operation: Args.string({
      description: "Dependency operation to run.",
      required: true,
      options: ["list", "outdated", "audit"],
    }),
  };

  static override flags = devixBaseFlags;

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Deps);

    const { runDepsCommand, DepsError } = await import("@devix-cli/deps");

    try {
      const { manager, output } = await runDepsCommand(
        join(flags.cwd),
        args.operation as "list" | "outdated" | "audit",
      );

      if (flags.json) {
        this.log(
          JSON.stringify(
            {
              manager,
              operation: args.operation,
              exitCode: output.exitCode,
              stdout: output.stdout,
              stderr: output.stderr,
            },
            null,
            2,
          ),
        );
        return;
      }

      const ui = this.renderer(flags);
      if (flags.quiet) {
        return;
      }

      this.header(ui, `devix deps ${args.operation}`);
      ui.section("Run", (ui) =>
        ui.fields([
          field("Manager", manager),
          field(
            "Exit",
            String(output.exitCode),
            output.exitCode === 0 ? "ok" : "warn",
            output.exitCode === 0 ? undefined : "Non-zero is a result here, not a failure.",
          ),
        ]),
      );
      ui.blank();
      ui.section("Output", (ui) => {
        // The manager output is passed through verbatim: Devix does not
        // reformat another tool's report.
        for (const line of output.stdout.split("\n")) {
          ui.line(line);
        }
        if (output.stderr.trim().length > 0) {
          ui.blank();
          for (const line of output.stderr.trim().split("\n")) {
            ui.line(ui.style.muted(line));
          }
        }
      });

      ui.blank();
    } catch (error) {
      if (error instanceof DepsError) {
        this.error(error.message, { exit: 1 });
      }
      throw error;
    }
  }
}
