import { summarizeProject, type DetectorRegistry } from "@devix/project-detector";

import { DepsError } from "./errors.js";

/** Package managers Devix can delegate to. */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Detection precedence when several managers have markers: lockfiles
 * win over bare manifests, and the lockfile is proof of intent.
 */
const PRECEDENCE: readonly PackageManager[] = ["pnpm", "yarn", "bun", "npm"];

/** The lockfile marker each manager's detector is keyed by. */
const LOCKFILE_BY_MANAGER: Record<PackageManager, string> = {
  npm: "package-lock.json",
  pnpm: "pnpm-lock.yaml",
  yarn: "yarn.lock",
  bun: "bun.lockb",
};

/**
 * Detects the package manager of the project at `directory` by running
 * the project detector and applying the lockfile precedence. A
 * manager-specific lockfile wins; a bare `package.json` (node without
 * any manager lockfile) maps to npm, npm's default behavior.
 */
export async function detectPackageManager(
  directory: string,
  registry?: DetectorRegistry,
): Promise<PackageManager> {
  const { createDefaultRegistry } = await import("@devix/project-detector");
  const summary = await summarizeProject(registry ?? createDefaultRegistry(), {
    cwd: directory,
  });

  const detectedIds = new Set(
    [...summary.packageManagers, ...summary.languages]
      .map((entry) => entry.id)
      .filter((id) => id in LOCKFILE_BY_MANAGER),
  );

  for (const manager of PRECEDENCE) {
    if (detectedIds.has(manager)) {
      return manager;
    }
  }

  // No manager lockfile anywhere: a Node.js project defaults to npm.
  if (summary.languages.some((entry) => entry.id === "node")) {
    return "npm";
  }

  throw DepsError.pmUndetected(directory);
}

/** The lockfile file name a manager is identified by. */
export function lockfileFor(manager: PackageManager): string {
  return LOCKFILE_BY_MANAGER[manager];
}
