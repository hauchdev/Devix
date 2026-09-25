/** Everything a template renderer needs to know. */
export interface TemplateContext {
  /** Absolute root (already normalized by `scaffold`). */
  readonly root: string;
  /** Normalized platform id from the catalog. */
  readonly platform: string;
  /** Project/mod/plugin name. */
  readonly name: string;
  /** Java package, e.g. `com.example.mymod`. */
  readonly packageName: string;
  /** Project version. */
  readonly version: string;
  /** Target Minecraft version, e.g. `1.21.1`. */
  readonly minecraftVersion: string;
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

/** Renderer contract every platform module implements. */
export type PlatformRenderer = (context: TemplateContext) => TemplateFile[];
