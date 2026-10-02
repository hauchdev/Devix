/**
 * Plugin API for Devix (PHASE 11).
 *
 * Security posture: plugins are manifest metadata only. This API never
 * loads dynamic code — installing a plugin is a human decision, and
 * registration only validates shapes. Data is data, never code.
 */

/** A command contributed by a plugin. */
export interface PluginCommandCapability {
  /** Command id, e.g. "docker". */
  readonly id: string;
  /** Human-readable description shown in help. */
  readonly description: string;
  /**
   * Trusted package that exports the command class. Must be an
   * internal `@devix-cli/*` package or a vetted plugin.
   */
  readonly module: string;
  /**
   * Named export that holds the command class. Defaults to the
   * command id converted to PascalCase.
   */
  readonly export?: string;
}

/** A doctor check contributed by a plugin. */
export interface PluginDoctorCheckCapability {
  /** Stable check id, e.g. "docker-daemon". */
  readonly id: string;
  /** Human-readable description. */
  readonly description: string;
  /** Trusted package that exports the check implementation. */
  readonly module: string;
  /** Named export. Defaults to "doctorChecks". */
  readonly export?: string;
}

/** A project detector contributed by a plugin. */
export interface PluginDetectorCapability {
  /** Detector id. */
  readonly id: string;
  /** Trusted package that exports the detector implementation. */
  readonly module: string;
  /** Named export. Defaults to "detectors". */
  readonly export?: string;
}

/** A lifecycle hook contributed by a plugin. */
export interface PluginHookCapability {
  /** Event name, e.g. "after-scaffold". */
  readonly event: string;
  /** Trusted package that exports the hook handler. */
  readonly module: string;
  /** Named export. Defaults to "hooks". */
  readonly export?: string;
}

/** All extension points a plugin can fill. */
export interface PluginCapabilities {
  readonly commands?: readonly PluginCommandCapability[];
  readonly doctorChecks?: readonly PluginDoctorCheckCapability[];
  readonly detectors?: readonly PluginDetectorCapability[];
  readonly hooks?: readonly PluginHookCapability[];
}

/** What a Devix plugin declares about itself. */
export interface PluginManifest {
  /** Stable plugin id, e.g. "docker". */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Semantic version of the plugin. */
  readonly version: string;
  /** One-line description of what the plugin adds. */
  readonly description: string;
  /**
   * Plugin API version the manifest targets. Currently "1".
   * Bumps when capabilities change incompatibly.
   */
  readonly apiVersion?: string;
  /**
   * Command names the plugin contributes, e.g. ["docker"]. Declared
   * for discoverability only: the CLI owns command dispatch.
   *
   * @deprecated Use `capabilities.commands` instead.
   */
  readonly commands?: readonly string[];
  /** Extension points this plugin implements. */
  readonly capabilities?: PluginCapabilities;
}

/** A registered plugin: its manifest plus its registered entry. */
export interface RegisteredPlugin {
  readonly manifest: PluginManifest;
}

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const API_VERSION_PATTERN = /^\d+$/;

function assertNonEmptyString(
  value: unknown,
  label: string,
  pluginError: PluginErrorFactory,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw pluginError(`${label} must be a non-empty string`);
  }
}

function assertStringArray(
  value: unknown,
  label: string,
  pluginError: PluginErrorFactory,
): asserts value is readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw pluginError(`${label} must be an array of strings`);
  }
}

/** Validates a manifest's shape and throws PluginError on bad input. */
function assertValidManifest(manifest: PluginManifest, pluginError: PluginErrorFactory): void {
  if (typeof manifest.id !== "string" || !ID_PATTERN.test(manifest.id)) {
    throw pluginError(`plugin id must match ${ID_PATTERN.source}: ${String(manifest.id)}`);
  }
  assertNonEmptyString(manifest.name, "plugin name", pluginError);
  if (typeof manifest.version !== "string" || !SEMVER_PATTERN.test(manifest.version)) {
    throw pluginError(
      `plugin version must be semantic versioning: ${manifest.id} ${String(manifest.version)}`,
    );
  }
  assertNonEmptyString(manifest.description, "plugin description", pluginError);

  if (manifest.apiVersion !== undefined) {
    if (typeof manifest.apiVersion !== "string" || !API_VERSION_PATTERN.test(manifest.apiVersion)) {
      throw pluginError(`plugin apiVersion must be a major version number: ${manifest.id}`);
    }
  }

  if (manifest.commands !== undefined) {
    assertStringArray(manifest.commands, "plugin commands", pluginError);
  }

  if (manifest.capabilities !== undefined) {
    assertValidCapabilities(manifest.capabilities, manifest.id, pluginError);
  }
}

function assertValidCapabilities(
  capabilities: PluginCapabilities,
  pluginId: string,
  pluginError: PluginErrorFactory,
): void {
  if (typeof capabilities !== "object" || capabilities === null || Array.isArray(capabilities)) {
    throw pluginError(`capabilities must be an object: ${pluginId}`);
  }

  if (capabilities.commands !== undefined) {
    if (!Array.isArray(capabilities.commands)) {
      throw pluginError(`capabilities.commands must be an array: ${pluginId}`);
    }
    for (const command of capabilities.commands) {
      assertCapabilityEntry(command, "command", pluginId, pluginError);
      assertNonEmptyString(command.description, "command description", pluginError);
    }
  }

  for (const key of ["doctorChecks", "detectors", "hooks"] as const) {
    const list = capabilities[key];
    if (list !== undefined) {
      if (!Array.isArray(list)) {
        throw pluginError(`capabilities.${key} must be an array: ${pluginId}`);
      }
      for (const entry of list) {
        assertCapabilityEntry(entry, key.slice(0, -1), pluginId, pluginError);
      }
    }
  }
}

function assertCapabilityEntry(
  entry: { readonly id?: string; readonly module?: string } | undefined,
  label: string,
  pluginId: string,
  pluginError: PluginErrorFactory,
): void {
  if (entry === undefined || typeof entry !== "object" || Array.isArray(entry)) {
    throw pluginError(`${label} capability must be an object: ${pluginId}`);
  }
  assertNonEmptyString(entry.id, `${label} id`, pluginError);
  assertNonEmptyString(entry.module, `${label} module`, pluginError);
}

/** Minimal error factory so core stays dependency-free. */
export interface PluginErrorFactory {
  (message: string): Error;
}

/**
 * Registry of Devix plugins, keyed by stable plugin id. Registration
 * order is preserved for deterministic listings.
 */
export class PluginRegistry {
  private readonly byId = new Map<string, RegisteredPlugin>();
  private readonly order: string[] = [];
  private readonly pluginError: PluginErrorFactory;

  constructor(pluginError: PluginErrorFactory) {
    this.pluginError = pluginError;
  }

  /** Registers a plugin manifest; throws on duplicates or bad shapes. */
  register(manifest: PluginManifest): this {
    assertValidManifest(manifest, this.pluginError);
    if (this.byId.has(manifest.id)) {
      throw this.pluginError(`plugin already registered: ${manifest.id}`);
    }
    this.byId.set(manifest.id, { manifest });
    this.order.push(manifest.id);
    return this;
  }

  /** Registers several manifests in order. */
  registerAll(manifests: readonly PluginManifest[]): this {
    for (const manifest of manifests) {
      this.register(manifest);
    }
    return this;
  }

  /** True when a plugin with the given id is registered. */
  has(id: string): boolean {
    return this.byId.has(id);
  }

  /** Registered plugin ids, in registration order. */
  ids(): readonly string[] {
    return [...this.order];
  }

  /** All registered plugins, in registration order. */
  all(): readonly RegisteredPlugin[] {
    return this.order.map((id) => {
      const plugin = this.byId.get(id);
      if (plugin === undefined) {
        throw this.pluginError(`plugin registry inconsistency: ${id}`);
      }
      return plugin;
    });
  }
}
