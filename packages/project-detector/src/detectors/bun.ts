import { isFile } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

/**
 * Detects Bun projects via `bun.lockb` (binary), `bun.lock` (text) or
 * `bunfig.toml` in the project root.
 *
 * "Not found" is not an error: it reports `detected: false`.
 */
export const bunDetector: Detector = {
  id: "bun",
  name: "Bun",
  category: "packageManager",
  markers: ["bun.lockb", "bun.lock", "bunfig.toml"],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of ["bun.lockb", "bun.lock", "bunfig.toml"] as const) {
      const path = join(context.root, marker);
      if (await isFile(path)) {
        detections.push({ marker, path });
      }
    }

    return detections.length > 0
      ? { detected: true, detections }
      : { detected: false, detections: [] };
  },
};
