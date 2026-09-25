/**
 * The platforms the plugin can scaffold, with the metadata the CLI and
 * the API share.
 */
export interface MinecraftPlatform {
  /** Stable id used in the API and CLI. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** What kind of project it generates. */
  readonly kind: "mod" | "plugin" | "proxy-plugin";
  /** One-line description. */
  readonly description: string;
}

/**
 * All supported Minecraft platforms. `architectury` is a multi-loader
 * mod: common + fabric + forge targets in one Gradle project. `folia`
 * is Paper's regionised-multithreaded fork: plugin.yml based.
 */
export const MINECRAFT_PLATFORMS: readonly MinecraftPlatform[] = [
  {
    id: "fabric",
    name: "Fabric",
    kind: "mod",
    description: "Fabric mod skeleton (Gradle + fabric.mod.json + client entry).",
  },
  {
    id: "forge",
    name: "Forge",
    kind: "mod",
    description: "Forge mod skeleton (Gradle + mods.toml + main class).",
  },
  {
    id: "architectury",
    name: "Architectury",
    kind: "mod",
    description:
      "Architectury multi-loader skeleton (common + fabric + forge targets in one Gradle build).",
  },
  {
    id: "spigot",
    name: "Spigot",
    kind: "plugin",
    description: "Spigot/Bukkit plugin skeleton (Maven + plugin.yml).",
  },
  {
    id: "paper",
    name: "Paper",
    kind: "plugin",
    description: "Paper plugin skeleton (Gradle + paper-plugin.yml).",
  },
  {
    id: "folia",
    name: "Folia",
    kind: "plugin",
    description: "Folia plugin skeleton (Gradle + plugin.yml, regionised threading aware).",
  },
  {
    id: "velocity",
    name: "Velocity",
    kind: "proxy-plugin",
    description: "Velocity proxy plugin skeleton (Gradle + velocity-plugin.json).",
  },
  {
    id: "bungeecord",
    name: "BungeeCord",
    kind: "proxy-plugin",
    description: "BungeeCord proxy plugin skeleton (Maven + bungee.yml).",
  },
];

/** The platform ids, in catalog order. */
export const PLATFORM_IDS: readonly string[] = MINECRAFT_PLATFORMS.map((p) => p.id);
