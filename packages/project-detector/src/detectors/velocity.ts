import { isFile } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";
import { readManifestDetail } from "./minecraft-manifest.js";

/** velocity-plugin.json at the root or in the resources directory. */
const VELOCITY_MARKERS = [
  "velocity-plugin.json",
  "src/main/resources/velocity-plugin.json",
] as const;

/** The plugin id declared by the manifest. */
const ID_PATTERN = /"id"\s*:\s*"([^"]+)"/;

/**
 * Detects Velocity proxy plugin projects via `velocity-plugin.json`,
 * flat or inside `src/main/resources`. Velocity has no legacy plugin
 *.yml format; annotation scanning lands here only as the manifest
 * file marker. "Not found" is not an error.
 */
export const velocityDetector: Detector = {
  id: "velocity",
  name: "Velocity",
  category: "minecraft",
  markers: [...VELOCITY_MARKERS],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of VELOCITY_MARKERS) {
      const path = join(context.root, marker);
      if (await isFile(path)) {
        const detail = await readManifestDetail(path, ID_PATTERN);
        detections.push(detail === undefined ? { marker, path } : { marker, path, detail });
      }
    }

    return detections.length > 0
      ? { detected: true, detections }
      : { detected: false, detections: [] };
  },
};
