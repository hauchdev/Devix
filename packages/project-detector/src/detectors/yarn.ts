import { isFile, readFileString } from "@devix/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

/** Extracts the lockfile version (e.g. "6.0") from a yarn.lock header comment. */
function parseLockfileVersion(content: string): string | undefined {
  const match = /^# yarn lockfile v(\d+(?:\.\d+)*)$/m.exec(content);
  return match?.[1];
}

/**
 * Detects Yarn projects via `yarn.lock` and/or `.yarnrc.yml` in the
 * project root.
 *
 * "Not found" is not an error: it reports `detected: false`. A malformed
 * lockfile is not a detection failure either: the marker still counts.
 */
export const yarnDetector: Detector = {
  id: "yarn",
  name: "Yarn",
  category: "packageManager",
  markers: ["yarn.lock", ".yarnrc.yml"],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    const lockfilePath = join(context.root, "yarn.lock");
    if (await isFile(lockfilePath)) {
      const content = await readFileString(lockfilePath).catch(() => undefined);
      const detail = content === undefined ? undefined : parseLockfileVersion(content);
      detections.push(
        detail === undefined
          ? { marker: "yarn.lock", path: lockfilePath }
          : { marker: "yarn.lock", path: lockfilePath, detail },
      );
    }

    const rcPath = join(context.root, ".yarnrc.yml");
    if (await isFile(rcPath)) {
      detections.push({ marker: ".yarnrc.yml", path: rcPath });
    }

    return detections.length > 0
      ? { detected: true, detections }
      : { detected: false, detections: [] };
  },
};
