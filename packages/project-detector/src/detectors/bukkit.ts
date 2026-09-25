import { isFile } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";
import { readManifestDetail } from "./minecraft-manifest.js";

/** plugin.yml / paper-plugin.yml at the root or in the resources directory. */
const BUKKIT_MARKERS = [
  "plugin.yml",
  "src/main/resources/plugin.yml",
  "paper-plugin.yml",
  "src/main/resources/paper-plugin.yml",
] as const;

/** `name: MyPlugin` in YAML, single line, ignoring inline comments. */
const NAME_PATTERN = /^name:[ \t]*([^\r\n#]*?)[ \t]*(?:#.*)?$/m;

/**
 * Detects Bukkit/Spigot/Paper plugin projects via `plugin.yml` or
 * `paper-plugin.yml`, flat or inside `src/main/resources`. "Not found"
 * is not an error.
 */
export const bukkitDetector: Detector = {
  id: "bukkit",
  name: "Bukkit/Spigot/Paper",
  category: "minecraft",
  markers: [...BUKKIT_MARKERS],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of BUKKIT_MARKERS) {
      const path = join(context.root, marker);
      if (await isFile(path)) {
        const detail = await readManifestDetail(path, NAME_PATTERN);
        detections.push(detail === undefined ? { marker, path } : { marker, path, detail });
      }
    }

    return detections.length > 0
      ? { detected: true, detections }
      : { detected: false, detections: [] };
  },
};
