import { findProjectRoot } from "./root.js";
import { DetectorRegistry } from "./registry.js";
import type { DetectionResult, Detector, ProjectDetection } from "./types.js";

export interface DetectProjectOptions {
  /** Directory where the upward search starts. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Detectors to run, in order. Defaults to all registered in the given registry. */
  detectors?: readonly Detector[];
}

/**
 * Detects project characteristics starting at `cwd` (or `process.cwd()`).
 *
 * The root is the nearest directory (walking up) that contains any
 * detector marker; when none is found, `cwd` itself is used and
 * `isProject` stays `false`. Detectors never throw for "not found":
 * each one reports `detected: false` instead.
 */
export async function detectProject(
  registry: DetectorRegistry,
  options: DetectProjectOptions = {},
): Promise<ProjectDetection> {
  const detectors = options.detectors ?? registry.all();
  const startDir = options.cwd ?? process.cwd();
  const root = await findProjectRoot(startDir, detectors);

  const results = new Map<string, DetectionResult>();
  let isProject = false;

  for (const detector of detectors) {
    const result = await detector.detect({ root });
    results.set(detector.id, result);
    if (result.detected) {
      isProject = true;
    }
  }

  return { root, isProject, detectors: results };
}

export { DetectorRegistry } from "./registry.js";
