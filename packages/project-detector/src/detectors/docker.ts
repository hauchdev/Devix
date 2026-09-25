import { isFile } from "@devix/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

/**
 * Markers checked in declaration order, following Docker's own naming
 * conventions: capitalized Dockerfile variants, compose files with or
 * without the `.yaml`/`.yml` extension, and `.dockerignore`.
 */
const DOCKER_MARKERS = [
  "Dockerfile",
  "Dockerfile.dev",
  "Dockerfile.prod",
  "docker-compose.yml",
  "docker-compose.yaml",
  "docker-compose.dev.yml",
  "docker-compose.prod.yml",
  "compose.yml",
  "compose.yaml",
  "compose.dev.yml",
  "compose.prod.yml",
  ".dockerignore",
] as const;

/**
 * Detects Docker projects via Dockerfiles, compose files or
 * `.dockerignore` in the project root.
 *
 * "Not found" is not an error: it reports `detected: false`.
 */
export const dockerDetector: Detector = {
  id: "docker",
  name: "Docker",
  category: "tool",
  markers: DOCKER_MARKERS,

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of DOCKER_MARKERS) {
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
