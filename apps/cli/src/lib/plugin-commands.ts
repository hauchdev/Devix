import type { PluginCommandCapability } from "@devix-cli/core";
import { BUILTIN_PLUGIN_MANIFESTS, createPluginRegistry } from "./builtin-plugins.js";

/** A lazily-loaded oclif Command class contributed by a plugin. */
export interface PluginCommandEntry {
  readonly commandId: string;
  readonly description: string;
  readonly load: () => Promise<unknown>;
}

function pascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function defaultExportName(commandId: string): string {
  return pascalCase(commandId);
}

/**
 * Registry of commands contributed by built-in plugins. The CLI uses this
 * to discover and load plugin-provided commands without hardcoding imports
 * in command files.
 */
export class PluginCommandRegistry {
  private readonly entries = new Map<string, PluginCommandEntry>();

  constructor() {
    const registry = createPluginRegistry().registerAll(BUILTIN_PLUGIN_MANIFESTS);
    for (const plugin of registry.all()) {
      const capabilities = plugin.manifest.capabilities?.commands ?? [];
      for (const command of capabilities) {
        this.register(command);
      }
    }
  }

  private register(capability: PluginCommandCapability): void {
    if (this.entries.has(capability.id)) {
      throw new Error(`duplicate plugin command id: ${capability.id}`);
    }

    const exportName = capability.export ?? defaultExportName(capability.id);
    this.entries.set(capability.id, {
      commandId: capability.id,
      description: capability.description,
      load: async () => {
        const module = (await import(capability.module)) as Record<string, unknown>;
        const exported = module[exportName];
        if (exported === undefined) {
          throw new Error(
            `plugin command ${capability.id} missing export '${exportName}' from ${capability.module}`,
          );
        }
        return exported;
      },
    });
  }

  /** All registered plugin command ids. */
  ids(): readonly string[] {
    return [...this.entries.keys()];
  }

  /** Load a command class by id. */
  async load(commandId: string): Promise<unknown> {
    const entry = this.entries.get(commandId);
    if (entry === undefined) {
      throw new Error(`unknown plugin command: ${commandId}`);
    }
    return entry.load();
  }

  /** True when the registry knows the command id. */
  has(commandId: string): boolean {
    return this.entries.has(commandId);
  }

  /** Metadata of all registered commands. */
  metadata(): readonly { readonly id: string; readonly description: string }[] {
    return [...this.entries.values()].map((entry) => ({
      id: entry.commandId,
      description: entry.description,
    }));
  }
}

/** Shared registry instance. */
export const pluginCommandRegistry = new PluginCommandRegistry();
