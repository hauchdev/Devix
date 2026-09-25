import { isFile, readFileString } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

/**
 * Extracts a top-level TOML string value from the `[package]` section.
 * This is not a TOML parser: just enough to read `name` and `edition`
 * from well-formed Cargo.toml files. A malformed manifest is not a
 * detection failure: the marker still counts without detail.
 */
function parseCargoPackageField(content: string, field: string): string | undefined {
  const sectionMatch = /^\s*\[package\]\s*$/m.exec(content);
  if (sectionMatch === null) {
    return undefined;
  }
  const rest = content.slice((sectionMatch.index ?? 0) + sectionMatch[0].length);
  const fieldMatch = new RegExp(`^\\s*${field}\\s*=\\s*"([^"]+)"`, "m").exec(rest);
  return fieldMatch?.[1];
}

/**
 * Detects Rust projects via `Cargo.toml` and/or `Cargo.lock` in the
 * project root.
 *
 * Extracts the `[package]` name and edition from the manifest as
 * detection details. "Not found" is not an error.
 */
export const rustDetector: Detector = {
  id: "rust",
  name: "Rust",
  category: "language",
  markers: ["Cargo.toml", "Cargo.lock"],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    const manifestPath = join(context.root, "Cargo.toml");
    if (await isFile(manifestPath)) {
      const content = await readFileString(manifestPath).catch(() => undefined);
      const name = content === undefined ? undefined : parseCargoPackageField(content, "name");
      const edition =
        content === undefined ? undefined : parseCargoPackageField(content, "edition");
      detections.push(
        name === undefined
          ? { marker: "Cargo.toml", path: manifestPath }
          : { marker: "Cargo.toml", path: manifestPath, detail: name },
      );
      if (edition !== undefined) {
        detections.push({ marker: "Cargo.toml#edition", path: manifestPath, detail: edition });
      }
    }

    const lockPath = join(context.root, "Cargo.lock");
    if (await isFile(lockPath)) {
      detections.push({ marker: "Cargo.lock", path: lockPath });
    }

    return detections.length > 0
      ? { detected: true, detections }
      : { detected: false, detections: [] };
  },
};
