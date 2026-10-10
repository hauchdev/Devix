import { describe, expect, it } from "vitest";

import {
  cards,
  detectedTree,
  displayCommand,
  health,
  projectLine,
  rootLabel,
  suggestions,
  suggestionRole,
  type Snapshot,
} from "../src/lib/home-panel.js";

/** A snapshot with every probe reporting a healthy result. */
function healthy(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    root: "/home/dev/project",
    isProject: true,
    languages: ["node", "typescript"],
    packageManagers: ["pnpm"],
    tools: ["eslint"],
    minecraft: [],
    checks: [
      { id: "node", name: "Node.js", status: "ok", detail: "22.23.2" },
      { id: "pnpm", name: "pnpm", status: "ok", detail: "12.5.1" },
      { id: "bun", name: "Bun", status: "missing" },
    ],
    isRepository: true,
    gitUpstream: "origin/main",
    gitAhead: 0,
    gitBehind: 0,
    dockerAvailable: true,
    dockerVersion: "28.0.4",
    ...overrides,
  };
}

describe("projectLine", () => {
  it("reads as a sentence for a single language", () => {
    expect(projectLine(healthy({ languages: ["node"] }))).toBe("a node project using pnpm.");
  });

  it("joins the last two languages with and", () => {
    expect(projectLine(healthy())).toBe("a node and typescript project using pnpm.");
  });

  it("uses commas before the last of three languages", () => {
    expect(projectLine(healthy({ languages: ["node", "typescript", "rust"] }))).toBe(
      "a node, typescript and rust project using pnpm.",
    );
  });

  it("says so plainly when there is no project", () => {
    expect(projectLine(healthy({ isProject: false }))).toBe(
      "Not a project — no markers found here.",
    );
  });

  it("does not invent a manager when none was detected", () => {
    expect(projectLine(healthy({ packageManagers: [] }))).toBe("a node and typescript project.");
  });

  it("handles a project with no languages at all", () => {
    expect(projectLine(healthy({ languages: [] }))).toBe("a project using pnpm.");
  });
});

describe("health", () => {
  it("counts only the checks that passed", () => {
    expect(health(healthy())).toEqual({ good: 2, total: 3 });
  });

  it("reports zero rather than dividing by zero when empty", () => {
    expect(health(healthy({ checks: [] }))).toEqual({ good: 0, total: 0 });
  });
});

describe("cards", () => {
  it("always offers stack, tools, git and docker", () => {
    expect(cards(healthy()).map((card) => card.title)).toEqual(["Stack", "Tools", "Git", "Docker"]);
  });

  it("names the missing tools rather than hiding them", () => {
    const tools = cards(healthy()).find((card) => card.title === "Tools");

    expect(tools?.lines).toContain("missing: Bun");
  });

  it("says nothing detected when the stack is empty", () => {
    const stack = cards(healthy({ languages: [], packageManagers: [], tools: [] })).find(
      (card) => card.title === "Stack",
    );

    expect(stack?.lines).toEqual(["nothing detected"]);
  });

  it("marks a clean toolset as success and a broken one as a warning", () => {
    const clean = cards(
      healthy({ checks: [{ id: "node", name: "Node.js", status: "ok", detail: "22" }] }),
    ).find((card) => card.title === "Tools");
    const broken = cards(healthy()).find((card) => card.title === "Tools");

    expect(clean?.accent).toBe("success");
    expect(broken?.accent).toBe("warning");
  });

  it("does not present a non-repository as a problem", () => {
    const git = cards(healthy({ isRepository: false })).find((card) => card.title === "Git");

    expect(git?.accent).toBe("muted");
    expect(git?.lines).toEqual(["not a repository"]);
  });

  it("flags a diverged branch instead of calling it clean", () => {
    const git = cards(healthy({ gitAhead: 2 })).find((card) => card.title === "Git");

    expect(git?.accent).toBe("warning");
    expect(git?.lines).toContain("+2 -0");
  });
});

describe("detectedTree", () => {
  it("groups each category that has something in it", () => {
    const labels = detectedTree(healthy()).map((node) => node.label);

    expect(labels).toContain("Languages");
    expect(labels).toContain("Package managers");
    // Nothing was detected, so there is nothing to group.
    expect(labels).not.toContain("Minecraft");
  });

  it("admits an empty directory instead of drawing an empty tree", () => {
    const tree = detectedTree(
      healthy({ languages: [], packageManagers: [], tools: [], minecraft: [] }),
    );

    expect(tree).toHaveLength(1);
    expect(tree[0]?.label).toContain("No markers found");
  });
});

describe("suggestions", () => {
  it("puts an unpushed commit ahead of everything else", () => {
    // No missing tools here, so git sync is the only urgent thing.
    const clean = healthy({
      gitAhead: 3,
      checks: [{ id: "node", name: "Node.js", status: "ok", detail: "22" }],
    });

    expect(suggestions(clean)[0]).toMatchObject({ command: "git sync", priority: "now" });
  });

  it("still ranks both urgent items, missing tools first", () => {
    // With a missing tool and an unpushed commit, the broken tool is
    // the thing worth reading about first.
    const urgent = suggestions(healthy({ gitAhead: 3 }))
      .filter((item) => item.priority === "now")
      .map((item) => item.command);

    expect(urgent).toEqual(["doctor", "git sync"]);
  });

  it("uses the singular for one commit", () => {
    const clean = healthy({
      gitAhead: 1,
      checks: [{ id: "node", name: "Node.js", status: "ok", detail: "22" }],
    });

    expect(suggestions(clean)[0]?.because).toBe("1 unpushed commit");
    expect(suggestions({ ...clean, gitAhead: 2 })[0]?.because).toBe("2 unpushed commits");
  });

  it("derives the display command from the id and args", () => {
    // A suggestion that displays one thing and runs another is worse
    // than no suggestion at all, so the two cannot be stored apart.
    for (const item of suggestions(healthy({ gitAhead: 1, isProject: false }))) {
      expect(item.command).toBe(displayCommand(item.id, item.args));
    }
  });

  it("runs `docker status`, which exists, rather than a `docker doctor`", () => {
    const step = suggestions(healthy({ dockerAvailable: false })).find(
      (item) => item.id === "docker",
    );

    expect(step?.args).toEqual(["status"]);
    expect(step?.command).toBe("docker status");
  });

  it("runs `git sync` through the topic id oclif resolves", () => {
    const clean = healthy({
      gitAhead: 1,
      checks: [{ id: "node", name: "Node.js", status: "ok", detail: "22" }],
    });

    const step = suggestions(clean).find((item) => item.id === "git:sync");

    expect(step?.args).toEqual([]);
    expect(step?.command).toBe("git sync");
  });

  it("does not suggest syncing when nothing is unpushed", () => {
    const commands = suggestions(healthy()).map((item) => item.command);

    expect(commands).not.toContain("git sync");
  });

  it("explains the missing tools rather than listing every command", () => {
    const doctor = suggestions(healthy()).find((item) => item.command === "doctor");

    expect(doctor?.because).toBe("explain the 1 missing tool");
  });

  it("does not suggest scaffolding inside an existing project", () => {
    const commands = suggestions(healthy()).map((item) => item.command);

    expect(commands).not.toContain("minecraft init");
  });

  it("offers scaffolding when there is nothing here", () => {
    const commands = suggestions(healthy({ isProject: false })).map((item) => item.command);

    expect(commands).toContain("minecraft init");
  });

  it("always ends with the evidence command", () => {
    const commands = suggestions(healthy());

    expect(commands[commands.length - 1]?.command).toContain("detect");
  });

  it("returns suggestions ordered by urgency", () => {
    const order = suggestions(healthy({ gitAhead: 1, isProject: false })).map(
      (item) => item.priority,
    );
    const rank = { now: 0, next: 1, later: 2 };

    for (let index = 1; index < order.length; index += 1) {
      expect(rank[order[index] ?? 3]).toBeGreaterThanOrEqual(rank[order[index - 1] ?? 0]);
    }
  });
});

describe("suggestionRole", () => {
  it("gives each urgency its own emphasis", () => {
    expect(suggestionRole("now")).toBe("warning");
    expect(suggestionRole("next")).toBe("primary");
    expect(suggestionRole("later")).toBe("muted");
  });
});

describe("rootLabel", () => {
  it("uses the directory name", () => {
    expect(rootLabel(healthy())).toBe("project");
  });

  it("falls back to the full path when there is no name", () => {
    expect(rootLabel(healthy({ root: "/" }))).toBe("/");
  });
});
