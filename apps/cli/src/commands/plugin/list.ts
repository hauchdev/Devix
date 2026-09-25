import { Command, Flags } from "@oclif/core";

export default class PluginList extends Command {
  static override description = "List installed Devix plugins.";

  static override flags = {
    json: Flags.boolean({
      description: "Output as JSON.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(PluginList);

    const { createPluginRegistry, BUILTIN_PLUGIN_MANIFESTS } = await import(
      "../../lib/builtin-plugins.js"
    );

    const registry = createPluginRegistry().registerAll(BUILTIN_PLUGIN_MANIFESTS);
    const plugins = registry.all().map((p) => p.manifest);

    if (flags.json) {
      this.log(JSON.stringify(plugins, null, 2));
      return;
    }

    if (plugins.length === 0) {
      this.log("No plugins installed.");
      return;
    }

    for (const plugin of plugins) {
      const commands = plugin.commands?.join(", ") ?? "none";
      this.log(`  ${plugin.id} ${plugin.version}`);
      this.log(`    ${plugin.description}`);
      this.log(`    commands: ${commands}`);
    }
  }
}
