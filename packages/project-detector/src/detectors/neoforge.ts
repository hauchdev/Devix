import { isFile } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";
import { readManifestDetail } from "./minecraft-manifest.toml.js";

/** NeoForge 1.20.5+ uses the dedicated neoforge.mods.toml name. */
const NEOFORGE_MARKERS = [
  "src/main/resources/META-INF/neoforge.mods.toml",
  "META-INF/neoforge.mods.toml",
] as const;

/** [[mods]] modId = "..." (TOML). */
const MOD_ID_PATTERN = /modId\s*=\s*["']([^"']+)["']/;

/**
 * Detects NeoForge mod projects via `META-INF/neoforge.mods.toml`,
 * flat or inside `src/main/resources`. "Not found" is not an error.
 */
export const neoforgeDetector: Detector = {
  id: "neoforge",
  name: "NeoForge",
  category: "minecraft",
  markers: [...NEOFORGE_MARKERS],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of NEOFORGE_MARKERS) {
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
