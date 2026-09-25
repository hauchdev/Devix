import { detectProject, type DetectProjectOptions } from "./detect.js";
import type { DetectorRegistry } from "./registry.js";
import type { Detection } from "./types.js";

/** Primary detection of one detector, flattened for consumption. */
export interface SummaryEntry {
  /** Detector id, e.g. "pnpm". */
  readonly id: string;
  /** Detector display name, e.g. "pnpm". */
  readonly name: string;
  /** Detector category, e.g. "language". */
  readonly category: string;
  /** First detection of the detector, when detected. */
  readonly detection?: Detection;
}

/** A category-grouped view of a project detection. */
export interface ProjectSummary {
  /** Absolute path of the detected project root. */
  readonly root: string;
  /** True when at least one marker was found anywhere. */
  readonly isProject: boolean;
  /** Detected entries per category, in registration order. */
  readonly languages: readonly SummaryEntry[];
  readonly packageManagers: readonly SummaryEntry[];
  readonly tools: readonly SummaryEntry[];
}

/** Category key for language detectors. */
const LANGUAGE_CATEGORY = "language";
/** Category key for package manager detectors. */
const PACKAGE_MANAGER_CATEGORY = "packageManager";

function toEntry(
  id: string,
  name: string,
  category: string,
  detections: readonly Detection[],
): SummaryEntry {
  const detection = detections[0];
  return detection === undefined ? { id, name, category } : { id, name, category, detection };
}

/**
 * Detects a project and composes the results into a category-grouped
 * summary: `languages`, `packageManagers` and `tools`.
 *
 * Only detected detectors produce entries; entries keep registration
 * order within their category. Detectors whose category is neither
 * "language" nor "packageManager" are grouped under `tools`, keeping
 * first-appearance order of their categories.
 */
export async function summarizeProject(
  registry: DetectorRegistry,
  options: DetectProjectOptions = {},
): Promise<ProjectSummary> {
  const detection = await detectProject(registry, options);

  const byCategory = new Map<string, SummaryEntry[]>();
  for (const detector of registry.all()) {
    const result = detection.detectors.get(detector.id);
    if (result === undefined || !result.detected) {
      continue;
    }
    const entries = byCategory.get(detector.category) ?? [];
    entries.push(toEntry(detector.id, detector.name, detector.category, result.detections));
    byCategory.set(detector.category, entries);
  }

  return {
    root: detection.root,
    isProject: detection.isProject,
    languages: byCategory.get("language") ?? [],
    packageManagers: byCategory.get("packageManager") ?? [],
    tools: [...byCategory.entries()]
      .filter(
        ([category]) => category !== LANGUAGE_CATEGORY && category !== PACKAGE_MANAGER_CATEGORY,
      )
      .flatMap(([, entries]) => entries),
  };
}
