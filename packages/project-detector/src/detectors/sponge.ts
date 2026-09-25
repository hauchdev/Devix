import { isFile } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";
import { readManifestDetail } from "./minecraft-manifest.js";

/** sponge_plugin.json (modern) or the legacy mcmod.info (Sponge 7-). */
const SPONGE_MARKERS = [
  "sponge_plugin.json",
  "src/main/resources/sponge_plugin.json",
  "src/main/resources/mcmod.info",
  "mcmod.info",
] as const;

/** The plugin id declared by the modern manifest. */
const ID_PATTERN = /"id"\s*:\s*"([^"]+)"/;

/**
 * Detects Sponge plugin projects via `sponge_plugin.json` (Sponge 8+)
 * or the legacy `mcmod.info` (Sponge 7 and earlier), flat or inside
 * `src/main/resources`. "Not found" is not an error.
 */
export const spongeDetector: Detector = {
  id: "sponge",
  name: "Sponge",
  category: "minecraft",
  markers: [...SPONGE_MARKERS],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of SPONGE_MARKERS) {
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
