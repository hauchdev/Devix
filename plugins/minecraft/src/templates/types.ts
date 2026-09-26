import type { MinecraftProjectKind } from "../catalog.js";
import type { ResolvedVersions } from "../versions.js";

/**
 * Everything a template renderer needs to know. Dependency versions
 * come from the version catalog (`deps`), never hardcoded.
 */
export interface TemplateContext {
  /** Absolute root (already normalized by `scaffold`). */
  readonly root: string;
  /** Normalized platform id from the catalog (primary). */
  readonly platform: string;
  /** All normalized platform ids, primary first (multi-loader aware). */
  readonly platforms: readonly string[];
  /** Project kind: mod, plugin or proxy-plugin. */
  readonly kind: MinecraftProjectKind;
  /** Project/mod/plugin name. */
  readonly name: string;
  /** Java package, e.g. `com.example.mymod`. */
  readonly packageName: string;
  /** Project version. */
  readonly version: string;
  /** Resolved toolchain + dependency versions for the target loaders. */
  readonly versions: ResolvedVersions[];
  /**
   * Modules of the project: the entrypoint module first, then the
   * optional extras (api, core, game-tests, datagen).
   */
  readonly modules: readonly string[];
  /** True when the project has more than one module. */
  readonly multimodule: boolean;
}

/** A single generated file, relative to the scaffold root. */
export interface TemplateFile {
  /** Relative path with forward slashes, e.g. `src/main/java/...`. */
  readonly path: string;
  /** Full file contents. */
  readonly contents: string;
}

/** Package path fragment: `com.example.mymod` -> `com/example/mymod`. */
export function packagePath(packageName: string): string {
  return packageName.split(".").join("/");
}

/** The last package segment: `com.example.mymod` -> `mymod`. */
export function packageLeaf(packageName: string): string {
  const segments = packageName.split(".");
  return segments[segments.length - 1] ?? "project";
}

/** `my mod` / `MyMod` / `my-mod` -> `MyMod` (identifier-safe). */
export function pascalCase(value: string): string {
  const parts = value.split(/[^a-zA-Z0-9]+/).filter((part) => part.length > 0);
  const joined = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  return joined.length > 0 ? joined : "Project";
}

/** Gradle subproject path of a module: `api` -> `:api`, `game-tests` -> `:game-tests`. */
export function moduleProjectPath(module: string): string {
  return `:${module}`;
}

/**
 * Gradle subproject directory of a module. The entrypoint module sits
 * at the root of the build (`.`); extras get their own directory.
 */
export function moduleDir(module: string, isMain: boolean): string {
  return isMain ? "." : module;
}

/**
 * Maven artifact id of a module: the main module keeps the project
 * slug, extras are suffixed (`mymod-api`, `mymod-core`).
 */
export function moduleArtifactId(module: string, isMain: boolean, projectSlug: string): string {
  return isMain ? projectSlug : `${projectSlug}-${module}`;
}

/** The optional modules of a context (everything but the first). */
export function extraModules(context: TemplateContext): readonly string[] {
  return context.modules.slice(1);
}

/**
 * The resolved versions of one platform of the context, by platform
 * id (undefined when absent).
 */
export function versionsFor(
  context: TemplateContext,
  platformId: string,
): ResolvedVersions | undefined {
  const index = context.platforms.indexOf(platformId);
  return index === -1 ? undefined : context.versions[index];
}

/** Renderer contract every platform module implements. */
export type PlatformRenderer = (context: TemplateContext) => TemplateFile[];
