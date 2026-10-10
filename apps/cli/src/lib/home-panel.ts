import { basename, join } from "node:path";

import type { Card, Theme, TreeNode } from "@devix-cli/ui";

/**
 * What the home panel needs to know, gathered by the command and shaped
 * here.
 *
 * This module holds no I/O: it takes a plain snapshot and decides how to
 * present it. That is what lets the layout be tested without a terminal,
 * a filesystem or a Docker daemon anywhere in sight.
 */

/** A snapshot of the environment, as the home panel sees it. */
export interface Snapshot {
  /** The directory that was inspected. */
  readonly root: string;
  /** True when project markers were found in it. */
  readonly isProject: boolean;
  /** Detected language ids. */
  readonly languages: readonly string[];
  /** Detected package manager ids. */
  readonly packageManagers: readonly string[];
  /** Detected tool ids. */
  readonly tools: readonly string[];
  /** Detected Minecraft platforms, already formatted. */
  readonly minecraft: readonly string[];
  /** Tool checks, with an outcome and an optional version. */
  readonly checks: readonly {
    readonly id: string;
    readonly name: string;
    readonly status: "ok" | "warn" | "missing";
    readonly detail?: string;
  }[];
  /** Git upstream, when the directory is a repository with one. */
  readonly gitUpstream?: string;
  /** How many local commits are not pushed. */
  readonly gitAhead?: number;
  /** How many remote commits are not merged. */
  readonly gitBehind?: number;
  /** True when the directory is inside a git repository at all. */
  readonly isRepository: boolean;
  /** True when Docker answered. */
  readonly dockerAvailable: boolean;
  /** The detected Docker version, when it answered. */
  readonly dockerVersion?: string;
}

/** One next step, with the reason it is being suggested. */
export interface Suggestion {
  /** The oclif command id, e.g. `git:sync`, `doctor`, `minecraft`. */
  readonly id: string;
  /** Arguments for the command, e.g. `["init"]`. */
  readonly args: readonly string[];
  /** The command as the user would type it, e.g. `devix git sync`. */
  readonly command: string;
  /** What it will do for this user, right now. */
  readonly because: string;
  /** How strongly to push it. Drives the ordering. */
  readonly priority: "now" | "next" | "later";
}

/**
 * The command as the user would type it.
 *
 * Derived from the id and args rather than stored next to them, because
 * a suggestion that displays one thing and runs another is worse than no
 * suggestion at all.
 */
export function displayCommand(id: string, args: readonly string[]): string {
  const base = id.replaceAll(":", " ");
  return args.length === 0 ? base : `${base} ${args.join(" ")}`;
}

/**
 * A one-line summary of the project.
 *
 * Reads like a sentence rather than a list of ids, because "a Node and
 * TypeScript project using pnpm" is what someone actually wants to know;
 * a column of ids is what the machine wants to know.
 */
export function projectLine(snapshot: Snapshot): string {
  if (!snapshot.isProject) {
    return "Not a project — no markers found here.";
  }

  const parts: string[] = [];
  const languages = snapshot.languages;
  if (languages.length === 1) {
    parts.push(`a ${languages[0]} project`);
  } else if (languages.length > 1) {
    // "a node and typescript project" for two, "a node, typescript and
    // rust project" for three: the last item is joined with "and" and
    // the rest with commas, which is the English convention.
    const head = languages.slice(0, -1).join(", ");
    parts.push(`a ${head} and ${languages.at(-1)} project`);
  } else {
    parts.push("a project");
  }

  const managers = snapshot.packageManagers;
  if (managers.length > 0) {
    parts.push(`using ${managers.join(" and ")}`);
  }

  return `${parts.join(" ")}.`;
}

/** How many checks passed, out of the total. */
export function health(snapshot: Snapshot): { readonly good: number; readonly total: number } {
  const total = snapshot.checks.length;
  const good = snapshot.checks.filter((check) => check.status === "ok").length;
  return { good, total };
}

/**
 * The cards shown side by side under the summary.
 *
 * A card exists only when it has something to say: an empty "Docker"
 * card is noise, so it is left out entirely rather than shown as "not
 * available".
 */
export function cards(snapshot: Snapshot): Card[] {
  const result: Card[] = [];

  const stack = [...snapshot.languages, ...snapshot.packageManagers, ...snapshot.tools];
  result.push({
    title: "Stack",
    lines: stack.length === 0 ? ["nothing detected"] : stack.slice(0, 4),
    accent: "primary",
  });

  const { good, total } = health(snapshot);
  const missing = snapshot.checks
    .filter((check) => check.status === "missing")
    .map((check) => check.name);
  result.push({
    title: "Tools",
    lines: [
      `${String(good)} of ${String(total)} ready`,
      ...(missing.length > 0 ? [`missing: ${missing.join(", ")}`] : []),
    ],
    accent: good === total ? "success" : "warning",
  });

  if (snapshot.isRepository) {
    const drift =
      (snapshot.gitAhead ?? 0) + (snapshot.gitBehind ?? 0) === 0
        ? "in sync"
        : `+${String(snapshot.gitAhead ?? 0)} -${String(snapshot.gitBehind ?? 0)}`;
    result.push({
      title: "Git",
      lines: [snapshot.gitUpstream ?? "no upstream", drift],
      accent: (snapshot.gitAhead ?? 0) + (snapshot.gitBehind ?? 0) === 0 ? "success" : "warning",
    });
  } else {
    result.push({ title: "Git", lines: ["not a repository"], accent: "muted" });
  }

  result.push({
    title: "Docker",
    lines: snapshot.dockerAvailable ? [snapshot.dockerVersion ?? "running"] : ["not available"],
    accent: snapshot.dockerAvailable ? "success" : "muted",
  });

  return result;
}

/** A tree of what was detected, for the detail section. */
export function detectedTree(snapshot: Snapshot): TreeNode[] {
  const nodes: TreeNode[] = [];

  const group = (label: string, items: readonly string[]): void => {
    if (items.length > 0) {
      nodes.push({
        label,
        role: "muted",
        children: items.map((item) => ({ label: item, role: "primary" as const })),
      });
    }
  };

  group("Languages", snapshot.languages);
  group("Package managers", snapshot.packageManagers);
  group("Tools", snapshot.tools);
  group("Minecraft", snapshot.minecraft);

  if (nodes.length === 0) {
    return [{ label: "No markers found in this directory.", role: "muted" }];
  }

  return nodes;
}

/**
 * Next steps, ordered so the most useful one comes first.
 *
 * The suggestions are derived from what is actually wrong here, not from
 * a tour of every command: a user whose environment is clean has nothing
 * to fix, and telling them to run `devix doctor` anyway is how a welcome
 * screen becomes noise.
 */
export function suggestions(snapshot: Snapshot): Suggestion[] {
  const result: Suggestion[] = [];

  /** Builds a suggestion, deriving the display form from the id and args. */
  const step = (
    id: string,
    args: readonly string[],
    because: string,
    priority: Suggestion["priority"],
  ): Suggestion => ({ id, args, command: displayCommand(id, args), because, priority });

  if (!snapshot.isProject) {
    result.push(step("minecraft", ["init"], "scaffold a project here", "next"));
  }

  const missing = snapshot.checks.filter((check) => check.status === "missing");
  if (missing.length > 0) {
    result.push(
      step(
        "doctor",
        [],
        `explain the ${String(missing.length)} missing tool${missing.length === 1 ? "" : "s"}`,
        "now",
      ),
    );
  }

  if (snapshot.isRepository && (snapshot.gitAhead ?? 0) > 0) {
    result.push(
      step(
        "git:sync",
        [],
        `${String(snapshot.gitAhead ?? 0)} unpushed commit${(snapshot.gitAhead ?? 0) === 1 ? "" : "s"}`,
        "now",
      ),
    );
  }

  if (snapshot.minecraft.length > 0) {
    result.push(step("minecraft", ["run"], "launch the project", "next"));
  }

  if (!snapshot.dockerAvailable) {
    // `docker status` is the operation that reports availability; there
    // is no `docker doctor`.
    result.push(step("docker", ["status"], "check whether Docker is usable here", "later"));
  }

  result.push(step("detect", [], "see the evidence behind this summary", "later"));

  const order: Record<Suggestion["priority"], number> = { now: 0, next: 1, later: 2 };
  return result.sort((a, b) => order[a.priority] - order[b.priority]);
}

/** The theme role a suggestion's arrow is drawn in. */
export function suggestionRole(priority: Suggestion["priority"]): keyof Theme {
  switch (priority) {
    case "now":
      return "warning";
    case "next":
      return "primary";
    case "later":
      return "muted";
  }
}

/** A short label for the directory, for the header. */
export function rootLabel(snapshot: Snapshot): string {
  const name = basename(snapshot.root);
  return name.length === 0 ? snapshot.root : name;
}

/** Resolves the command's working directory. */
export function resolveCwd(cwd: string): string {
  return join(cwd);
}
