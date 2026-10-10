import {
  detectMinecraftPlatforms,
  summarizeProject,
  type DetectorRegistry,
} from "@devix-cli/project-detector";

import type { ProjectReport } from "./types.js";

/**
 * Inspects the project at `options`.
 *
 * Reuses `@devix-cli/project-detector` entirely: the doctor only shapes
 * the result for reporting, it never duplicates detection logic.
 *
 * With `root` the inspection is limited to exactly that directory;
 * with `cwd` the detector searches parents for the project root.
 */
export async function checkProject(
  registry: DetectorRegistry,
  options: { readonly cwd?: string; readonly root?: string },
): Promise<ProjectReport> {
  const detectionOptions: { cwd?: string; root?: string } =
    options.root !== undefined
      ? { root: options.root }
      : options.cwd !== undefined
        ? { cwd: options.cwd }
        : {};

  const [summary, minecraft] = await Promise.all([
    summarizeProject(registry, detectionOptions),
    detectMinecraftPlatforms(registry, detectionOptions),
  ]);

  return {
    root: summary.root,
    isProject: summary.isProject,
    languages: summary.languages.map((entry) => entry.id),
    packageManagers: summary.packageManagers.map((entry) => entry.id),
    tools: summary.tools.map((entry) => entry.id),
    minecraft: minecraft.platforms.map((platform) =>
      platform.detail === undefined ? platform.id : `${platform.id} (${platform.detail})`,
    ),
  };
}
