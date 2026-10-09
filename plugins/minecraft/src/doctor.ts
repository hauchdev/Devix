import { isFile, readFileString } from "@devix-cli/filesystem";
import { createDefaultRegistry, detectMinecraftPlatforms } from "@devix-cli/project-detector";
import { join } from "node:path";

import { getPlatform } from "./catalog.js";
import { isKnownMinecraftVersion, resolveVersionSpec } from "./versions.js";

/**
 * A health check for an existing Minecraft project.
 *
 * Scaffolding gets a project onto disk; this is the other half — telling
 * a developer whose build just broke *which* piece is missing. It is
 * read-only and every probe degrades to a `missing` or `warn` check
 * rather than an error, because a diagnosis is not a gate.
 */

/** Outcome of one check. */
export type MinecraftCheckStatus = "ok" | "warn" | "missing";

/** One diagnostic check. */
export interface MinecraftCheck {
  /** Stable id, e.g. "wrapper". */
  readonly id: string;
  /** Human-readable label. */
  readonly name: string;
  /** Outcome. */
  readonly status: MinecraftCheckStatus;
  /** What was found, when something was. */
  readonly detail?: string;
  /** What to do about it, when there is something to do. */
  readonly hint?: string;
}

/** The full diagnosis of a Minecraft project. */
export interface MinecraftDoctorReport {
  /** Absolute directory inspected. */
  readonly root: string;
  /** True when the directory is a Minecraft project at all. */
  readonly isMinecraft: boolean;
  /** Detected platform ids. */
  readonly platforms: readonly string[];
  /** Build system inferred from the detected platforms. */
  readonly buildSystem: "gradle" | "maven" | "unknown";
  /** The checks, in a fixed, readable order. */
  readonly checks: readonly MinecraftCheck[];
}

/**
 * How the doctor reaches the machine.
 *
 * Injected so tests do not depend on whether Java is installed, and so
 * this package stays free of process execution: the CLI owns the probe
 * and passes it in. Every method resolves to `undefined` on failure
 * rather than throwing.
 */
export interface MinecraftDoctorServices {
  /** Resolves the Java major version, e.g. `21`, or undefined. */
  javaMajorVersion(): Promise<number | undefined>;
}

/** Build system implied by the detected platforms. */
function buildSystemFor(platformIds: readonly string[]): "gradle" | "maven" | "unknown" {
  const systems = new Set(
    platformIds
      .map((id) => getPlatform(id)?.buildSystem)
      .filter((system): system is "gradle" | "maven" => system !== undefined),
  );
  if (systems.size === 0) {
    return "unknown";
  }
  // A mixed build is still driven by the wrapper that exists; report
  // gradle when present because it is the common multi-loader case.
  return systems.has("gradle") ? "gradle" : "maven";
}

/** The wrapper scripts each build system expects. */
function wrapperNames(buildSystem: "gradle" | "maven" | "unknown"): readonly string[] {
  switch (buildSystem) {
    case "gradle":
      return ["gradlew", "gradlew.bat"];
    case "maven":
      return ["mvnw", "mvnw.cmd"];
    case "unknown":
      return [];
  }
}

/**
 * Reads `minecraft_version` out of a Gradle properties file, when
 * present. Maven projects declare it in the pom instead, which this
 * deliberately does not parse: a diagnosis that guesses is worse than
 * one that says it does not know.
 */
async function readGradleMinecraftVersion(root: string): Promise<string | undefined> {
  const path = join(root, "gradle.properties");
  if (!(await isFile(path))) {
    return undefined;
  }
  try {
    const contents = await readFileString(path);
    const match = /^minecraft_version\s*=\s*(.+)$/m.exec(contents);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

/**
 * Diagnoses the Minecraft project at `root`.
 *
 * Checks, in order: that a platform was detected, that the build wrapper
 * exists, that the wrapper jar is present, that the Java toolchain meets
 * the version the target ecosystem needs, and that the declared
 * Minecraft version is one the catalog supports.
 */
export async function doctorMinecraft(
  root: string,
  services: MinecraftDoctorServices,
): Promise<MinecraftDoctorReport> {
  const detection = await detectMinecraftPlatforms(createDefaultRegistry(), { root });
  const platforms = detection.platforms.map((platform) => platform.id);
  const buildSystem = buildSystemFor(platforms);
  const checks: MinecraftCheck[] = [];

  if (!detection.isMinecraft) {
    checks.push({
      id: "project",
      name: "Project",
      status: "missing",
      hint: "No Minecraft platform markers found in this directory.",
    });
    return { root, isMinecraft: false, platforms, buildSystem, checks };
  }

  checks.push({
    id: "project",
    name: "Project",
    status: "ok",
    detail: platforms.join(", "),
  });

  // Wrapper: the single most common reason a fresh clone will not build.
  const names = wrapperNames(buildSystem);
  if (names.length > 0) {
    const present = await Promise.all(names.map((name) => isFile(join(root, name))));
    const found = names.filter((_, index) => present[index] === true);
    if (found.length === 0) {
      checks.push({
        id: "wrapper",
        name: "Build wrapper",
        status: "warn",
        hint: `No ${buildSystem} wrapper found (${names.join(", ")}). Run \`${buildSystem} wrapper\` once to add it.`,
      });
    } else {
      checks.push({
        id: "wrapper",
        name: "Build wrapper",
        status: "ok",
        detail: found.join(", "),
      });
    }
  }

  // Gradle wrapper jar: the scripts call it, so its absence breaks the build.
  if (buildSystem === "gradle") {
    const jar = join(root, "gradle", "wrapper", "gradle-wrapper.jar");
    checks.push(
      (await isFile(jar))
        ? { id: "wrapper-jar", name: "Wrapper jar", status: "ok" }
        : {
            id: "wrapper-jar",
            name: "Wrapper jar",
            status: "warn",
            hint: "gradle/wrapper/gradle-wrapper.jar is missing. Run `gradle wrapper` to restore it.",
          },
    );
  }

  // Java toolchain against what the declared Minecraft version needs.
  const declaredVersion = await readGradleMinecraftVersion(root);
  const requiredJava = (() => {
    try {
      return resolveVersionSpec(declaredVersion).javaVersion;
    } catch {
      return undefined;
    }
  })();

  const javaMajor = await services.javaMajorVersion();
  if (javaMajor === undefined) {
    checks.push({
      id: "java",
      name: "Java",
      status: "warn",
      hint: "Java was not found on PATH. Install a JDK to build this project.",
    });
  } else if (requiredJava !== undefined && javaMajor < requiredJava) {
    checks.push({
      id: "java",
      name: "Java",
      status: "warn",
      detail: `Java ${String(javaMajor)}`,
      hint: `This project targets a Minecraft version that needs Java ${String(requiredJava)} or newer.`,
    });
  } else {
    checks.push({
      id: "java",
      name: "Java",
      status: "ok",
      detail:
        requiredJava === undefined
          ? `Java ${String(javaMajor)}`
          : `Java ${String(javaMajor)} (needs ${String(requiredJava)}+)`,
    });
  }

  // Version catalog: is the declared version one we can scaffold for?
  if (declaredVersion !== undefined) {
    checks.push(
      isKnownMinecraftVersion(declaredVersion)
        ? { id: "version", name: "Minecraft version", status: "ok", detail: declaredVersion }
        : {
            id: "version",
            name: "Minecraft version",
            status: "warn",
            detail: declaredVersion,
            hint: "This Minecraft version is not in the Devix catalog; dependency versions may be stale.",
          },
    );
  }

  return { root, isMinecraft: true, platforms, buildSystem, checks };
}
