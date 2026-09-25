import { Command, Flags } from "@oclif/core";
import { createDefaultRegistry, summarizeProject } from "@devix/project-detector";
import { join } from "node:path";

export default class Detect extends Command {
  static override description =
    "Detect the current project stack: languages, package managers and tools.";

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Directory to detect from. Defaults to the current directory.",
      default: process.cwd(),
    }),
    json: Flags.boolean({
      description: "Output the summary as JSON.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Detect);
    const summary = await summarizeProject(createDefaultRegistry(), {
      cwd: join(flags.cwd),
    });

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            root: summary.root,
            isProject: summary.isProject,
            languages: summary.languages.map((entry) => entry.id),
            packageManagers: summary.packageManagers.map((entry) => entry.id),
            tools: summary.tools.map((entry) => entry.id),
          },
          null,
          2,
        ),
      );
      return;
    }

    this.log(`Project root: ${summary.root}`);
    this.log("");

    if (!summary.isProject) {
      this.log("No project markers found in this directory tree.");
      return;
    }

    this.log(
      section(
        "Languages",
        summary.languages.map((entry) => entry.id),
      ),
    );
    this.log(
      section(
        "Package managers",
        summary.packageManagers.map((entry) => entry.id),
      ),
    );
    this.log(
      section(
        "Tools",
        summary.tools.map((entry) => entry.id),
      ),
    );
  }
}

/** Formats a one-line summary section: "Label: a, b, c" or "Label: none". */
function section(label: string, values: readonly string[]): string {
  return `${label}: ${values.length > 0 ? values.join(", ") : "none"}`;
}
