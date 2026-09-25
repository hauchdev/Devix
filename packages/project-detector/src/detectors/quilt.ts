import { isFile } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";
import { readManifestDetail } from "./minecraft-manifest.js";

/** quilt.mod.json at the root or in the canonical resources directory. */
const QUILT_MARKERS = ["quilt.mod.json", "src/main/resources/quilt.mod.json"] as const;

/** The mod id declared by the manifest (JSON with comments tolerated). */
const ID_PATTERN = /"id"\s*:\s*"([^"]+)"/;

/**
 * Detects Quilt mod projects via `quilt.mod.json`, either flat or
 * inside `src/main/resources`. "Not found" is not an error.
 */
export const quiltDetector: Detector = {
  id: "quilt",
  name: "Quilt",
  category: "minecraft",
  markers: [...QUILT_MARKERS],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of QUILT_MARKERS) {
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
