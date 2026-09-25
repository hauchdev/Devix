import { Command, Args, Flags } from "@oclif/core";
import { join } from "node:path";

export default class Deps extends Command {
  static override description =
    "Run read-only dependency commands through the detected package manager.";

  static override args = {
    operation: Args.string({
      description: "Dependency operation to run.",
      required: true,
      options: ["list", "outdated", "audit"],
    }),
  };

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Project directory. Defaults to the current directory.",
      default: process.cwd(),
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Deps);

    const { runDepsCommand } = await import("@devix-cli/deps");
    const { DepsError } = await import("@devix-cli/deps");

    try {
      const { manager, output } = await runDepsCommand(
        join(flags.cwd),
        args.operation as "list" | "outdated" | "audit",
      );

      this.log(`(${manager})`);
      if (output.stdout.trim().length > 0) {
        this.log(output.stdout.trimEnd());
      }
      if (output.stderr.trim().length > 0) {
        this.logToStderr(output.stderr.trimEnd());
      }
    } catch (error) {
      if (error instanceof DepsError) {
        switch (error.code) {
          case "EPM_NOT_FOUND":
            this.error(`${error.message}. Install it or run with the manager you have.`, {
              exit: 1,
            });
            break;
          case "EPM_UNDETECTED":
            this.error("no package manager detected: add a lockfile or package.json first", {
              exit: 1,
            });
            break;
          default:
            this.error(error.message, { exit: 1 });
        }
      }
      throw error;
    }
  }
}
