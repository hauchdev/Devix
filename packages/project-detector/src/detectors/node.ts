import { readFileString } from "@devix/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

/** A minimal package.json shape for detection purposes. */
interface PackageJsonInfo {
  readonly name?: unknown;
  readonly packageManager?: unknown;
  readonly engines?: unknown;
  readonly workspaces?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePackageJson(path: string, content: string): PackageJsonInfo | undefined {
  try {
    const parsed: unknown = JSON.parse(content);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export const nodeDetector: Detector = {
  id: "node",
  name: "Node.js",
  markers: ["package.json"],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const packageJsonPath = join(context.root, "package.json");

    const content = await readFileString(packageJsonPath).catch(() => undefined);
    if (content === undefined) {
      return { detected: false, detections: [] };
    }

    const detections: Detection[] = [{ marker: "package.json", path: packageJsonPath }];

    const info = parsePackageJson(packageJsonPath, content);

    if (info !== undefined) {
      const name = info["name"];
      if (typeof name === "string") {
        detections.push({
          marker: "package.json#name",
          path: packageJsonPath,
          detail: name,
        });
      }

      const packageManager = info["packageManager"];
      if (typeof packageManager === "string") {
        detections.push({
          marker: "package.json#packageManager",
          path: packageJsonPath,
          detail: packageManager,
        });
      }

      const engines = info["engines"];
      if (isRecord(engines)) {
        const entries = Object.keys(engines)
          .sort()
          .map((key) => `${key}@${String(engines[key])}`)
          .join(", ");
        detections.push({
          marker: "package.json#engines",
          path: packageJsonPath,
          detail: entries,
        });
      }

      if (info["workspaces"] !== undefined) {
        detections.push({
          marker: "package.json#workspaces",
          path: packageJsonPath,
        });
      }
    }

    return { detected: true, detections };
  },
};
