import { isDirectory, isFile } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

/** The kind of `.git` entry found: a directory or a gitfile pointer. */
export type GitMarkerKind = "directory" | "file";

/**
 * Detects Git repositories via a `.git` entry in the project root.
 *
 * `.git` is a directory in normal clones and a file pointing to the
 * real gitdir in worktrees and submodules: both count as detected, with
 * the entry kind reported as the detection detail.
 *
 * "Not found" is not an error: it reports `detected: false`.
 */
export const gitDetector: Detector = {
  id: "git",
  name: "Git",
  category: "tool",
  markers: [".git"],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const path = join(context.root, ".git");

    if (await isDirectory(path)) {
      const detection: Detection = { marker: ".git", path, detail: "directory" };
      return { detected: true, detections: [detection] };
    }

    if (await isFile(path)) {
      const detection: Detection = { marker: ".git", path, detail: "file" };
      return { detected: true, detections: [detection] };
    }

    return { detected: false, detections: [] };
  },
};
