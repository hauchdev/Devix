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

  const wrapper = await resolveWrapperCommand(resolved, task);
  const warnings = [...wrapper.warnings, ...(note === undefined ? [] : [note])];

  return {
    cwd: resolved,
    platforms: platformIds,
    isMinecraft: true,
    command: wrapper.command,
    windowsCommand: wrapper.windowsCommand,
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

/** A build plan: which wrapper to call and with which task. */
export interface BuildPlan {
  /** Absolute directory the plan refers to. */
  readonly cwd: string;
  /** Detected Minecraft platforms in the directory. */
  readonly platforms: readonly string[];
  /** True when at least one Minecraft platform was detected. */
  readonly isMinecraft: boolean;
  /** The command that builds the project. */
  readonly command: string;
  /** Windows-equivalent command when it differs from `command`. */
  readonly windowsCommand: string | undefined;
  /** Human-readable warnings (missing wrapper, unknown platform…). */
  readonly warnings: readonly string[];
}

/**
 * Plans how to build the Minecraft project at `cwd` without executing
 * anything, so the CLI can print it first.
 *
 * The task differs by kind: mod loaders build with `build`, server
 * plugins and proxies build their jar the same way. The wrapper choice
 * is the same logic `planRun` uses, shared through the helper below so
 * the two never drift.
 */
export async function planBuild(cwd: string): Promise<BuildPlan> {
  return planTask(cwd, "build");
}

/** Plans how to remove the build output of the project at `cwd`. */
export async function planClean(cwd: string): Promise<BuildPlan> {
  return planTask(cwd, "clean");
}

/**
 * Plans one Gradle task for the Minecraft project at `cwd`.
 *
 * Shared by `planBuild` and `planClean`: the only thing that differs is
 * the task name, so the wrapper resolution and the warnings stay
 * identical between them.
 */
export async function planTask(cwd: string, task: string): Promise<BuildPlan> {
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
  const { command, windowsCommand, warnings } = await resolveWrapperCommand(resolved, task);

  return {
    cwd: resolved,
    platforms: platformIds,
    isMinecraft: true,
    command,
    windowsCommand,
    warnings,
  };
}

/**
 * Resolves the wrapper invocation for a task.
 *
 * Shared by `planRun` and `planBuild` so a wrapper that is missing is
 * reported identically by both, and adding a third task later is a
 * one-line change rather than a third copy of this logic.
 */
async function resolveWrapperCommand(
  cwd: string,
  task: string,
): Promise<{ command: string; windowsCommand: string | undefined; warnings: readonly string[] }> {
  const [hasUnixWrapper, hasWindowsWrapper, hasJar] = await Promise.all([
    isFile(gradleWrapperName(cwd)),
    isFile(gradleWrapperBatName(cwd)),
    isFile(wrapperJarName(cwd)),
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

  const command = hasUnixWrapper ? `./gradlew ${task}` : `gradle ${task}`;
  const windowsCommand = hasWindowsWrapper ? `.\\gradlew.bat ${task}` : `gradle ${task}`;

  return {
    command,
    windowsCommand: command === windowsCommand ? undefined : windowsCommand,
    warnings,
  };
}
