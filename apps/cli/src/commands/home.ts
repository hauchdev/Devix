import { basename } from "node:path";

import { padEndVisible } from "@devix-cli/ui";

import { DevixCommand, devixBaseFlags, type DevixBaseFlags } from "../lib/devix-command.js";
import {
  cards,
  detectedTree,
  health,
  projectLine,
  resolveCwd,
  rootLabel,
  suggestions,
  suggestionRole,
  type Snapshot,
} from "../lib/home-panel.js";

/**
 * The landing panel.
 *
 * `devix` with no arguments used to print the help text. That is a
 * reference, not an introduction: it tells you what exists without
 * telling you anything about where you are. This command answers the
 * question a newcomer actually has first — "what am I looking at?" —
 * and then points at the one command that moves them forward.
 *
 * Everything it shows is read-only and every probe degrades to a
 * "not available" line rather than an error, because a welcome screen
 * that fails is worse than one that admits it does not know.
 */
export default class Home extends DevixCommand {
  static override description =
    "Show what Devix sees here: the project, the tools, and what to do next.";

  static override flags = devixBaseFlags;

  async run(): Promise<void> {
    const { flags } = await this.parse(Home);
    const cwd = resolveCwd(flags.cwd);

    const snapshot = await this.gather(cwd);

    if (flags.json) {
      this.log(JSON.stringify(this.toJson(snapshot), null, 2));
      return;
    }

    if (flags.quiet) {
      return;
    }

    this.render(snapshot, flags, flags.verbose);
  }

  /**
   * Collects everything the panel shows.
   *
   * Each probe is independent and individually optional: Git missing, a
   * directory that is not a repository and Docker not installed are all
   * normal states that the panel renders as facts, not failures.
   */
  private async gather(cwd: string): Promise<Snapshot> {
    const [doctor, git, docker] = await Promise.all([
      import("@devix-cli/doctor"),
      import("@devix-cli/git"),
      import("@devix-cli/docker"),
    ]);

    const report = await doctor.runDoctor({ cwd });

    const sync = await git
      .syncState(cwd)
      .then((state) => ({ ok: true as const, state }))
      .catch(() => ({ ok: false as const, state: undefined }));

    const availability = await docker.dockerAvailability().catch(() => undefined);

    return {
      root: report.project.root,
      isProject: report.project.isProject,
      languages: report.project.languages,
      packageManagers: report.project.packageManagers,
      tools: report.project.tools,
      minecraft: report.project.minecraft,
      checks: report.environment.checks,
      isRepository: sync.ok,
      ...(sync.ok
        ? {
            gitUpstream: sync.state.upstream ?? undefined,
            gitAhead: sync.state.ahead,
            gitBehind: sync.state.behind,
          }
        : {}),
      dockerAvailable: availability?.available ?? false,
      ...(availability?.available ? { dockerVersion: availability.version } : {}),
    };
  }

  /** The machine-readable shape, so the panel is scriptable too. */
  private toJson(snapshot: Snapshot): Record<string, unknown> {
    const { good, total } = health(snapshot);
    return {
      root: snapshot.root,
      summary: projectLine(snapshot),
      isProject: snapshot.isProject,
      stack: {
        languages: snapshot.languages,
        packageManagers: snapshot.packageManagers,
        tools: snapshot.tools,
        minecraft: snapshot.minecraft,
      },
      health: { ready: good, total },
      checks: snapshot.checks,
      git: snapshot.isRepository
        ? {
            upstream: snapshot.gitUpstream ?? null,
            ahead: snapshot.gitAhead ?? 0,
            behind: snapshot.gitBehind ?? 0,
          }
        : { repository: false },
      docker: { available: snapshot.dockerAvailable, version: snapshot.dockerVersion ?? null },
      next: suggestions(snapshot).map((item) => ({ command: item.command, because: item.because })),
    };
  }

  /** Draws the panel. */
  private render(snapshot: Snapshot, flags: DevixBaseFlags, verbose: boolean): void {
    const ui = this.renderer(flags);
    const { deck, theme, symbols } = ui;

    deck.banner("devix", "your environment, your project, your next step");
    ui.blank();

    deck.box(
      `Here · ${rootLabel(snapshot)}`,
      [
        projectLine(snapshot),
        ...(snapshot.isRepository
          ? [
              `Repository  ${snapshot.gitUpstream ?? "no upstream"}`,
              `Branch      ${
                (snapshot.gitAhead ?? 0) + (snapshot.gitBehind ?? 0) === 0
                  ? "in sync with the remote"
                  : `+${String(snapshot.gitAhead ?? 0)} ahead, ${String(snapshot.gitBehind ?? 0)} behind`
              }`,
            ]
          : ["Repository  not a git repository"]),
      ],
      { role: "primary" },
    );
    ui.blank();

    deck.cards(cards(snapshot));
    ui.blank();

    const { good, total } = health(snapshot);
    deck.meter({
      label: "tools ready",
      value: good,
      total,
      role: good === total ? "success" : "warning",
    });
    ui.blank();

    const next = suggestions(snapshot);
    // Pad on visible width, not string length: the command is already
    // painted, and String.length counts the escape sequences too.
    const column = Math.max(...next.map((item) => `devix ${item.command}`.length));

    deck.box(
      "Next",
      next.map((item) => {
        const role = suggestionRole(item.priority);
        const command = theme.paint(role, `devix ${item.command}`);
        return `${theme.paint(role, symbols.chevronRight)} ${padEndVisible(command, column)}  ${theme.faint("muted", item.because)}`;
      }),
      { role: "secondary", footer: "devix --help for everything else" },
    );
    ui.blank();

    if (verbose) {
      deck.box("Detected", [], { role: "border" });
      deck.tree(detectedTree(snapshot), { indent: 2 });
      ui.blank();
    }

    ui.footnote(`${basename(snapshot.root)} · devix doctor for the full report`);
  }
}
