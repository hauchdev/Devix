import { isFile, readFileString } from "@devix/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

/** Markers checked in declaration order: Maven first, then Gradle. */
const MAVEN_MARKERS = ["pom.xml"] as const;
const GRADLE_MARKERS = [
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "settings.gradle.kts",
  "gradlew",
] as const;

/** Extracts the <artifactId> from a pom.xml. */
function parseMavenArtifactId(content: string): string | undefined {
  const match = /<artifactId>([^<]+)<\/artifactId>/.exec(content);
  return match?.[1]?.trim() || undefined;
}

/** Extracts the project name from a Groovy or Kotlin settings/build file. */
function parseGradleProjectName(content: string): string | undefined {
  const match =
    /^rootProject\.name\s*=\s*["']([^"']+)["']/m.exec(content) ??
    /^\s*rootProject\.name\s*=\s*["']([^"']+)["']/m.exec(content);
  return match?.[1];
}

/**
 * Detects Java projects via Maven (`pom.xml`) or Gradle (`build.gradle`,
 * settings files and the wrapper) in the project root.
 *
 * Extracts the Maven `<artifactId>` and the Gradle `rootProject.name`
 * as detection details. "Not found" is not an error, and malformed
 * build files are not detection failures: the marker still counts.
 */
export const javaDetector: Detector = {
  id: "java",
  name: "Java",
  markers: [...MAVEN_MARKERS, ...GRADLE_MARKERS],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of MAVEN_MARKERS) {
      const path = join(context.root, marker);
      if (await isFile(path)) {
        const content = await readFileString(path).catch(() => undefined);
        const detail = content === undefined ? undefined : parseMavenArtifactId(content);
        detections.push(detail === undefined ? { marker, path } : { marker, path, detail });
      }
    }

    for (const marker of GRADLE_MARKERS) {
      const path = join(context.root, marker);
      if (await isFile(path)) {
        // rootProject.name only lives in settings files; the wrapper and
        // build files count as markers without a name detail.
        const isSettings = marker.startsWith("settings.gradle");
        const content = isSettings ? await readFileString(path).catch(() => undefined) : undefined;
        const detail = content === undefined ? undefined : parseGradleProjectName(content);
        detections.push(detail === undefined ? { marker, path } : { marker, path, detail });
      }
    }

    return detections.length > 0
      ? { detected: true, detections }
      : { detected: false, detections: [] };
  },
};
