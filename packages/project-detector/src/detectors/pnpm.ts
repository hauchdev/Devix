import { isFile, readFileString } from "@devix/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

/** Extracts the lockfile version (e.g. "9.0") from a pnpm-lock.yaml header. */
function parseLockfileVersion(content: string): string | undefined {
  const match = /lockfileVersion:\s*'?(\d+(?:\.\d+)*)'?/.exec(content);
  return match?.[1];
}

/**
 * Detects pnpm projects via `pnpm-lock.yaml` and/or `pnpm-workspace.yaml`
 * in the project root.
 *
 * "Not found" is not an error: it reports `detected: false`. A malformed
 * lockfile is not a detection failure either: the marker still counts.
 */
export const pnpmDetector: Detector = {
  id: "pnpm",
  name: "pnpm",
  markers: ["pnpm-lock.yaml", "pnpm-workspace.yaml"],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    const lockfilePath = join(context.root, "pnpm-lock.yaml");
    if (await isFile(lockfilePath)) {
      const content = await readFileString(lockfilePath).catch(() => undefined);
      const detail = content === undefined ? undefined : parseLockfileVersion(content);
      detections.push(
        detail === undefined
          ? { marker: "pnpm-lock.yaml", path: lockfilePath }
          : { marker: "pnpm-lock.yaml", path: lockfilePath, detail },
      );
    }

    const workspacePath = join(context.root, "pnpm-workspace.yaml");
    if (await isFile(workspacePath)) {
      detections.push({ marker: "pnpm-workspace.yaml", path: workspacePath });
    }

    return detections.length > 0
      ? { detected: true, detections }
      : { detected: false, detections: [] };
  },
};
