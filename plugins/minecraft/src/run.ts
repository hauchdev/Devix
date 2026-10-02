import { isFile } from "@devix-cli/filesystem";
import { createDefaultRegistry, detectMinecraftPlatforms } from "@devix-cli/project-detector";
import { isAbsolute, join, resolve } from "node:path";

import { MinecraftError } from "./errors.js";

/** Information returned by `planRun`. */
export interface RunPlan {
  /** Absolute directory the plan refers to. */
  readonly cwd: string;
  /** Detected Minecraft platforms in the directory. */
  readonly platforms: readonly string[];
  /** True when at least one Minecraft platform was detected. */
  readonly isMinecraft: boolean;
  /** Recommended command to run the project. */
  readonly command: string;
  /** Windows-equivalent command when it differs from `command`. */
  readonly windowsCommand: string | undefined;
  /** Human-readable warnings (missing wrapper jar, unknown platform…). */
  readonly warnings: readonly string[];
}

function gradleWrapperName(cwd: string): string {
  return join(cwd, "gradlew");
}

function gradleWrapperBatName(cwd: string): string {
  return join(cwd, "gradlew.bat");
}

function wrapperJarName(cwd: string): string {
  return join(cwd, "gradle", "wrapper", "gradle-wrapper.jar");
}

function pickTask(platformIds: readonly string[]): { task: string; note: string | undefined } {
  const hasModLoader = platformIds.some((id) =>
    ["fabric", "forge", "neoforge", "architectury"].includes(id),
  );
  const hasServerPlugin = platformIds.some((id) => id === "bukkit");

  if (hasModLoader) {
    return { task: "runClient", note: undefined };
  }
  if (hasServerPlugin) {
    return {
      task: "runServer",
      note: "Only works when the project configures a runServer task (e.g. Paperweight user dev). Otherwise build the jar and place it in your server.",
    };
  }
  return {
    task: "build",
    note: "This platform has no standard run task. Build the jar and place it in your proxy/server.",
  };
}

/**
 * Plans how to run the Minecraft project at `cwd` without executing
 * anything. The result is meant to be printed by the CLI (print-first).
 */
export async function planRun(cwd: string): Promise<RunPlan> {
  const resolved = isAbsolute(cwd) ? resolve(cwd) : resolve(process.cwd(), cwd);

  const detection = await detectMinecraftPlatforms(createDefaultRegistry(), { cwd: resolved });
  if (!detection.isMinecraft) {
    return {
      cwd: resolved,
      platforms: [],
      isMinecraft: false,
      command: "",
      windowsCommand: undefined,
      warnings: ["No Minecraft platform detected in this directory."],
    };
  }

  const platformIds = detection.platforms.map((platform) => platform.id);
  const { task, note } = pickTask(platformIds);

  const unixWrapper = gradleWrapperName(resolved);
  const windowsWrapper = gradleWrapperBatName(resolved);
  const jar = wrapperJarName(resolved);

  const [hasUnixWrapper, hasWindowsWrapper, hasJar] = await Promise.all([
    isFile(unixWrapper),
    isFile(windowsWrapper),
    isFile(jar),
  ]);

  const warnings: string[] = [];
  if (!hasUnixWrapper && !hasWindowsWrapper) {
    warnings.push("No Gradle wrapper scripts found. Install Gradle or run `gradle wrapper` first.");
  }
  if (!hasJar) {
    warnings.push(
      "The wrapper jar (`gradle/wrapper/gradle-wrapper.jar`) is missing. If you have Gradle installed, run `gradle wrapper` once to download it.",
    );
  }
  if (note !== undefined) {
    warnings.push(note);
  }

  const command = hasUnixWrapper ? `./gradlew ${task}` : `gradle ${task}`;
  const windowsCommand = hasWindowsWrapper ? `.\\gradlew.bat ${task}` : `gradle ${task}`;

  return {
    cwd: resolved,
    platforms: platformIds,
    isMinecraft: true,
    command,
    windowsCommand: command === windowsCommand ? undefined : windowsCommand,
    warnings,
  };
}

/** Convenience: throws a typed error when the directory is not a Minecraft project. */
export async function requireMinecraftRun(cwd: string): Promise<RunPlan> {
  const plan = await planRun(cwd);
  if (!plan.isMinecraft) {
    throw MinecraftError.invalid(plan.warnings[0] ?? "Not a Minecraft project.");
  }
  return plan;
}
