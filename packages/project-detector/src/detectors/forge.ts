import { isFile } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";
import { readManifestDetail } from "./minecraft-manifest.toml.js";

/** mods.toml (pre-1.20.5) or neoforge.mods.toml (1.20.5+ naming). */
const FORGE_MARKERS = [
  "src/main/resources/META-INF/mods.toml",
  "src/main/resources/META-INF/neoforge.mods.toml",
  "META-INF/mods.toml",
  "META-INF/neoforge.mods.toml",
] as const;

/** [[mods]] modId = "..." (TOML). */
const MOD_ID_PATTERN = /modId\s*=\s*["']([^"']+)["']/;

/**
 * Detects Forge mod projects via `META-INF/mods.toml` (or the newer
 * `neoforge.mods.toml` naming), flat or inside `src/main/resources`.
 * "Not found" is not an error.
 */
export const forgeDetector: Detector = {
  id: "forge",
  name: "Forge",
  category: "minecraft",
  markers: [...FORGE_MARKERS],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of FORGE_MARKERS) {
      const path = join(context.root, marker);
      if (await isFile(path)) {
        const detail = await readManifestDetail(path, MOD_ID_PATTERN);
        detections.push(detail === undefined ? { marker, path } : { marker, path, detail });
      }
    }

    return detections.length > 0
      ? { detected: true, detections }
      : { detected: false, detections: [] };
  },
};
