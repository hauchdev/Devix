import { isFile } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";
import { readManifestDetail } from "./minecraft-manifest.js";

/** bungee.yml (preferred) or the legacy Bukkit plugin.yml fallback. */
const BUNGEE_MARKERS = [
  "bungee.yml",
  "src/main/resources/bungee.yml",
  "plugin.yml",
  "src/main/resources/plugin.yml",
] as const;

/** `name: MyPlugin` in YAML, single line, ignoring inline comments. */
const NAME_PATTERN = /^name:[ \t]*([^\r\n#]*?)[ \t]*(?:#.*)?$/m;

/**
 * Detects BungeeCord proxy plugin projects via `bungee.yml` or the
 * legacy `plugin.yml` fallback, flat or inside `src/main/resources`.
 * "Not found" is not an error.
 */
export const bungeecordDetector: Detector = {
  id: "bungeecord",
  name: "BungeeCord",
  category: "minecraft",
  markers: [...BUNGEE_MARKERS],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of BUNGEE_MARKERS) {
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
