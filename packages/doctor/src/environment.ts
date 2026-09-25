import type { CheckResult, DoctorServices } from "./types.js";

/** Tools probed by the environment section, in report order. */
const TOOLS: readonly { id: string; name: string; versionArg: string }[] = [
  { id: "node", name: "Node.js", versionArg: "--version" },
  { id: "pnpm", name: "pnpm", versionArg: "--version" },
  { id: "npm", name: "npm", versionArg: "--version" },
  { id: "yarn", name: "Yarn", versionArg: "--version" },
  { id: "bun", name: "Bun", versionArg: "--version" },
  { id: "git", name: "Git", versionArg: "--version" },
];

/**
 * Probes the environment for the tools Devix integrates with.
 *
 * A missing tool is a `missing` check, never an error: the report is
 * a diagnosis, not a gate. Checks run in parallel; results keep the
 * declaration order.
 */
export async function checkEnvironment(services: DoctorServices): Promise<CheckResult[]> {
  const results = await Promise.all(
    TOOLS.map(async (tool): Promise<CheckResult> => {
      const version = await services.getToolVersion(tool.id, tool.versionArg);
      return version === undefined
        ? { id: tool.id, name: tool.name, status: "missing" }
        : { id: tool.id, name: tool.name, status: "ok", detail: version };
    }),
  );
  return results;
}
