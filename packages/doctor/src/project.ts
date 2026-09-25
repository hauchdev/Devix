import { summarizeProject, type DetectorRegistry } from "@devix-cli/project-detector";

import type { ProjectReport } from "./types.js";

/**
 * Inspects the project starting at `cwd` using the detector registry.
 *
 * Reuses `@devix-cli/project-detector` entirely: the doctor only shapes
 * the result for reporting, it never duplicates detection logic.
 */
export async function checkProject(
  registry: DetectorRegistry,
  cwd: string,
): Promise<ProjectReport> {
  const summary = await summarizeProject(registry, { cwd });

  return {
    root: summary.root,
    isProject: summary.isProject,
    languages: summary.languages.map((entry) => entry.id),
    packageManagers: summary.packageManagers.map((entry) => entry.id),
    tools: summary.tools.map((entry) => entry.id),
  };
}
