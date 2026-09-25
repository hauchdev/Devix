/** Machine-readable failure reasons of the minecraft plugin. */
export type MinecraftErrorCode = "EUNKNOWN_PLATFORM" | "EINVALID_INPUT" | "EEXISTS";

/** Typed error for the minecraft plugin. */
export class MinecraftError extends Error {
  /** Machine-readable reason. */
  readonly code: MinecraftErrorCode;
  /** The offending platform id, when applicable. */
  readonly platform: string | undefined;
  /** The offending path, when applicable. */
  readonly path: string | undefined;

  private constructor(
    code: MinecraftErrorCode,
    message: string,
    extra?: { platform?: string; path?: string; cause?: unknown },
  ) {
    super(message, { cause: extra?.cause });
    this.name = "MinecraftError";
    this.code = code;
    this.platform = extra?.platform;
    this.path = extra?.path;
  }

  /** The platform id is not in the catalog. */
  static unknownPlatform(platform: string, known: readonly string[]): MinecraftError {
    return new MinecraftError(
      "EUNKNOWN_PLATFORM",
      `Unknown platform: ${platform}. Known platforms: ${known.join(", ")}`,
      { platform },
    );
  }

  /** Options or values do not satisfy the API contract. */
  static invalid(message: string): MinecraftError {
    return new MinecraftError("EINVALID_INPUT", message);
  }

  /** The scaffold target already exists and overwrite is disabled. */
  static targetExists(path: string, conflicts: readonly string[]): MinecraftError {
    return new MinecraftError(
      "EEXISTS",
      `Refusing to overwrite: ${conflicts.length > 0 ? conflicts.join(", ") : path} already exist${conflicts.length === 1 ? "s" : ""}. Delete them first or pass overwrite: true.`,
      { path },
    );
  }
}
