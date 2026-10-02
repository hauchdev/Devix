import { join } from "node:path";

import { DevixCommand, devixBaseFlags } from "../../lib/devix-command.js";
import { gitErrorHint } from "../../lib/git-errors.js";

export default class GitDiff extends DevixCommand {
  static override description =
    "Working-tree diff against HEAD as per-file line counts (read-only).";

  static override flags = devixBaseFlags;

  async run(): Promise<void> {
    const { flags } = await this.parse(GitDiff);

    const { diffStat } = await import("@devix-cli/git");

    try {
      const result = await diffStat(join(flags.cwd));

      if (flags.json) {
        this.log(JSON.stringify(result, null, 2));
        return;
      }

      const ui = this.renderer(flags);
      if (flags.quiet) {
        return;
      }

      ui.title("devix git diff");
      ui.blank();

      if (result.entries.length === 0) {
        ui.line(`  ${ui.style.success(ui.symbols.success)}  No changes against HEAD.`);
        ui.blank();
        return;
      }

      const additions = result.entries.reduce((sum, entry) => sum + entry.additions, 0);
      const deletions = result.entries.reduce((sum, entry) => sum + entry.deletions, 0);

      ui.heading("Changed files", { count: result.entries.length });
      ui.table(
        ["+ADDED", "-REMOVED", "FILE"],
        result.entries.map((entry) => ({
          cells: [
            entry.binary ? "—" : `+${String(entry.additions)}`,
            entry.binary ? "—" : `-${String(entry.deletions)}`,
            entry.path,
          ],
        })),
      );

      ui.blank();
      ui.line(
        `  ${ui.style.success(`+${String(additions)}`)}  ${ui.style.error(`-${String(deletions)}`)}  across ${String(result.entries.length)} file(s)`,
      );
      ui.blank();
    } catch (error) {
      this.error(gitErrorHint(error), { exit: 1 });
    }
  }
}
