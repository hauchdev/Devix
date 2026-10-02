import { createUi } from "../dist/index.js";

const ui = createUi({ color: "enhanced", unicode: true, width: 78 });

ui.title("devix status");
ui.blank();

ui.heading("Project", { count: 1 });
ui.fields([
  { label: "Root", value: "C:/Users/junio/WebstormProjects/Devix" },
  { label: "Languages", value: "node, typescript, java, rust, python" },
  { label: "Managers", value: "pnpm" },
]);
ui.blank();

ui.heading("Environment", { count: 6 });
ui.fields([
  { label: "Node.js", value: "22.20.4", status: "ok" },
  { label: "pnpm", value: "12.5.1", status: "ok" },
  { label: "npm", value: "10.9.0", status: "ok" },
  { label: "Yarn", status: "muted" },
  { label: "Bun", status: "muted" },
  { label: "Git", value: "2.47.1", status: "ok" },
]);
ui.blank();

ui.heading("Git");
ui.fields([
  { label: "Upstream", value: "origin/main" },
  { label: "State", value: "ahead 12", status: "warn", hint: "Local commits are not pushed yet." },
]);
ui.blank();

ui.table(
  ["CONTAINER", "IMAGE", "STATUS"],
  [
    { cells: ["devix-api", "node:22-alpine", "Up 3 hours"], status: "ok" },
    { cells: ["devix-db", "postgres:17", "Up 3 hours"], status: "ok" },
    { cells: ["devix-cache", "redis:7", "Exited (0) 2 days ago"], status: "error" },
  ],
);
ui.blank();

ui.panel(
  "Next step",
  ["12 commits are waiting on origin/main.", "Review them, then push when ready."],
  { status: "warn" },
);
ui.blank();
ui.hint("devix git sync   show the commands to reconcile");
ui.footnote("devix 0.5.0");
