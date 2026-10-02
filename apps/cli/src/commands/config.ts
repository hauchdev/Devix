import { Args, Command, Flags } from "@oclif/core";

import { isAbsolute, resolve } from "node:path";

import {
  CONFIG_FILE_NAMES,
  ConfigError,
  findConfigPath,
  getConfigValue,
  listConfig,
  loadConfig,
  setConfigValue,
  writeConfig,
  type DevixConfig,
} from "@devix-cli/config";

/** Parses a CLI value as JSON, falling back to the raw string. */
function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Renders a config value for humans: strings raw, everything else JSON. */
function renderValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export default class Config extends Command {
  static override description =
    "Read and write the Devix configuration (devix.config.json / devix.json).";

  static override args = {
    operation: Args.string({
      description: "Operation to run.",
      required: true,
      options: ["get", "set", "list", "path"],
    }),
    key: Args.string({
      description: "Config key for get/set, dotted for nested keys (e.g. features.doctor).",
      required: false,
    }),
    value: Args.string({
      description: "Value for set. Parsed as JSON when possible, otherwise used as a string.",
      required: false,
    }),
  };

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Directory to start the config search from. Defaults to the current directory.",
      default: async () => process.cwd(),
    }),
    json: Flags.boolean({
      description: "Output as JSON.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Config);
    const cwd = isAbsolute(flags.cwd) ? flags.cwd : resolve(flags.cwd);

    try {
      switch (args.operation) {
        case "path":
          await this.runPath(cwd, flags.json);
          return;
        case "list":
          await this.runList(cwd, flags.json);
          return;
        case "get":
          await this.runGet(args.key, cwd, flags.json);
          return;
        case "set":
          await this.runSet(args.key, args.value, cwd, flags.json);
          return;
        default:
          this.error(`Unknown operation: ${String(args.operation)}`, { exit: 1 });
      }
    } catch (error) {
      if (error instanceof ConfigError) {
        this.error(error.message, { exit: 1 });
        return;
      }
      throw error;
    }
  }

  /** Resolves the config path plus the loaded config (or an empty one). */
  private async load(cwd: string): Promise<{ path: string; config: DevixConfig }> {
    const path = await findConfigPath({ cwd });
    const config = await loadConfig({ cwd });
    return { path, config: config ?? {} };
  }

  private async runPath(cwd: string, json: boolean): Promise<void> {
    const { path } = await this.load(cwd);

    if (json) {
      this.log(JSON.stringify({ path, names: CONFIG_FILE_NAMES }, null, 2));
      return;
    }

    this.log(path);
  }

  private async runList(cwd: string, json: boolean): Promise<void> {
    const { path, config } = await this.load(cwd);
    const entries = listConfig(config);

    if (json) {
      this.log(JSON.stringify({ path, config: entries }, null, 2));
      return;
    }

    const keys = Object.keys(entries);
    if (keys.length === 0) {
      this.log(`No configuration set (${path}).`);
      this.log("");
      this.log(`Set one with: devix config set <key> <value>`);
      return;
    }

    this.log(`Configuration (${path}):`);
    for (const key of keys) {
      this.log(`  ${key.padEnd(20)}${renderValue(entries[key])}`);
    }
  }

  private async runGet(key: string | undefined, cwd: string, json: boolean): Promise<void> {
    if (key === undefined) {
      this.error("get requires a key: devix config get <key>", { exit: 1 });
    }

    const { path, config } = await this.load(cwd);
    const value = getConfigValue(config, key);

    if (value === undefined) {
      this.error(`Unknown config key: ${key} (looked in ${path})`, { exit: 1 });
    }

    if (json) {
      this.log(JSON.stringify({ key, value }, null, 2));
      return;
    }

    this.log(renderValue(value));
  }

  private async runSet(
    key: string | undefined,
    rawValue: string | undefined,
    cwd: string,
    json: boolean,
  ): Promise<void> {
    if (key === undefined || rawValue === undefined) {
      this.error("set requires a key and a value: devix config set <key> <value>", { exit: 1 });
    }

    const path = await findConfigPath({ cwd });

    // Re-read through readConfigFile so an existing file keeps its
    // recognized name; a missing file starts from an empty config.
    const existing = await loadConfig({ cwd });
    const next = setConfigValue(existing ?? {}, key, parseValue(rawValue));

    await writeConfig(path, next);

    if (json) {
      this.log(JSON.stringify({ path, key, value: getConfigValue(next, key) }, null, 2));
      return;
    }

    this.log(`Set ${key} in ${path}`);
  }
}
