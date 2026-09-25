import { isFile } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";
import { readManifestDetail } from "./minecraft-manifest.js";

/** fabric.mod.json at the root or in the canonical resources directory. */
const FABRIC_MARKERS = ["fabric.mod.json", "src/main/resources/fabric.mod.json"] as const;

/** The mod id declared by the manifest (JSON with comments tolerated). */
const ID_PATTERN = /"id"\s*:\s*"([^"]+)"/;

/**
 * Detects Fabric mod projects via `fabric.mod.json`, either flat
 * (extracted/packed layouts) or inside `src/main/resources` (mod
 * workspaces). "Not found" is not an error.
 */
export const fabricDetector: Detector = {
  id: "fabric",
  name: "Fabric",
  category: "minecraft",
  markers: [...FABRIC_MARKERS],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of FABRIC_MARKERS) {
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
