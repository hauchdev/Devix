import { isFile } from "@devix/filesystem";
import { join } from "node:path";

import type { DetectContext, DetectionResult, Detector } from "../types.js";

/**
 * Detects npm projects via `package-lock.json` in the project root.
 *
 * "Not found" is not an error: it reports `detected: false`.
 */
export const npmDetector: Detector = {
  id: "npm",
  name: "npm",
  markers: ["package-lock.json"],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const path = join(context.root, "package-lock.json");

    if (await isFile(path)) {
      return { detected: true, detections: [{ marker: "package-lock.json", path }] };
    }

    return { detected: false, detections: [] };
  },
};
