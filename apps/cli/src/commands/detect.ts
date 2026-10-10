import { join } from "node:path";

import { DevixCommand, devixBaseFlags, field, hereFlag } from "../lib/devix-command.js";

export default class Detect extends DevixCommand {
  static override description =
    "Detect the current project stack: languages, package managers and tools.";

  static override flags = { ...devixBaseFlags, here: hereFlag };

  async run(): Promise<void> {
    const { flags } = await this.parse(Detect);

    // Loaded lazily so `devix --help` / `--version` never pay for the
    // detector stack at import time.
    const { createDefaultRegistry, summarizeProject } = await import("@devix-cli/project-detector");

    const target = join(flags.cwd);
    const summary = await summarizeProject(
      createDefaultRegistry(),
      flags.here ? { root: target } : { cwd: target },
    );

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
      ui.section("Project", (ui) =>
        ui.fields([
          field("Root", summary.root),
          field("Markers", "none", "warn", "No project markers in this directory tree."),
        ]),
      );
      ui.blank();
      return;
    }

    ui.section("Project", (ui) =>
      ui.fields([
        field("Root", summary.root),
        field("Languages", summary.languages.map((entry) => entry.id).join(", ") || "none"),
        field("Managers", summary.packageManagers.map((entry) => entry.id).join(", ") || "none"),
        field("Tools", summary.tools.map((entry) => entry.id).join(", ") || "none"),
      ]),
    );

    if (flags.verbose) {
      const evidence = [...summary.languages, ...summary.packageManagers, ...summary.tools];
      ui.blank();
      ui.section(
        "Evidence",
        (ui) =>
          ui.fields(
            evidence.map((entry) =>
              field(entry.id, entry.detection?.marker, "muted", entry.detection?.path),
            ),
          ),
        { count: evidence.length },
      );
    }

    ui.blank();
  }
}
