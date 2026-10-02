import { join } from "node:path";

import { DevixCommand, devixBaseFlags, field } from "../lib/devix-command.js";

export default class Detect extends DevixCommand {
  static override description =
    "Detect the current project stack: languages, package managers and tools.";

  static override flags = devixBaseFlags;

  async run(): Promise<void> {
    const { flags } = await this.parse(Detect);

    // Loaded lazily so `devix --help` / `--version` never pay for the
    // detector stack at import time.
    const { createDefaultRegistry, summarizeProject } = await import("@devix-cli/project-detector");

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

    const ui = this.renderer(flags);
    if (flags.quiet) {
      return;
    }

    ui.title("devix detect");
    ui.blank();

    if (!summary.isProject) {
      ui.fields([
        field("Root", summary.root),
        field("Markers", "none", "warn", "No project markers in this directory tree."),
      ]);
      ui.blank();
      return;
    }

    ui.heading("Project");
    ui.fields([
      field("Root", summary.root),
      field("Languages", summary.languages.map((entry) => entry.id).join(", ") || "none"),
      field("Managers", summary.packageManagers.map((entry) => entry.id).join(", ") || "none"),
      field("Tools", summary.tools.map((entry) => entry.id).join(", ") || "none"),
    ]);

    if (flags.verbose) {
      const evidence = [...summary.languages, ...summary.packageManagers, ...summary.tools];
      ui.blank();
      ui.heading("Evidence", { count: evidence.length });
      ui.fields(
        evidence.map((entry) =>
          field(entry.id, entry.detection?.marker, "muted", entry.detection?.path),
        ),
      );
    }

    ui.blank();
  }
}
