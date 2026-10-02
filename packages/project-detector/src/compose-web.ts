import { webFrameworkIdForMarker } from "./detectors/web.js";
import type { DetectorRegistry } from "./registry.js";
import type { Detection } from "./types.js";

/** One detected web framework, with its human-readable label. */
export interface DetectedWebFramework {
  /** Framework id, e.g. "next". */
  readonly id: string;
  /** Human-readable label, e.g. "Next.js". */
  readonly label: string;
  /** The dependency that proved the detection. */
  readonly package: string;
  /** Absolute path of the package.json that was read. */
  readonly path: string;
}

/** The web section of a project detection. */
export interface WebDetection {
  /** Absolute project root that was inspected. */
  readonly root: string;
  /** True when at least one web framework or bundler was found. */
  readonly isWeb: boolean;
  /** Detected frameworks, in the detector's declaration order. */
  readonly frameworks: readonly DetectedWebFramework[];
}

/**
 * Composes the web detectors of a registry into a single result.
 *
 * Like `detectMinecraftPlatforms`, this is a view over the detector
 * results rather than a second implementation: the evidence always
 * comes from the registry that was passed in.
 */
export async function detectWeb(
  registry: DetectorRegistry,
  options: { root: string },
): Promise<WebDetection> {
  const root = options.root;

  if (!registry.has("web")) {
    return { root, isWeb: false, frameworks: [] };
  }

  const result = await registry.get("web").detect({ root });
  if (!result.detected) {
    return { root, isWeb: false, frameworks: [] };
  }

  const frameworks: DetectedWebFramework[] = [];
  for (const detection of result.detections as readonly Detection[]) {
    const id = webFrameworkIdForMarker(detection.marker);
    if (id === undefined || detection.detail === undefined) {
      continue;
    }
    frameworks.push({
      id,
      label: detection.detail,
      package: detection.marker.slice("package.json#".length),
      path: detection.path,
    });
  }

  return {
    root,
    isWeb: frameworks.length > 0,
    frameworks,
  };
}
