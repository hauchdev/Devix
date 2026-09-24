export { ConfigError } from "./errors.js";
export type { ConfigErrorCode } from "./errors.js";

export type { DevixConfig, DevixConfigFeatures } from "./types.js";
export { CONFIG_FILE_NAMES, validateConfigShape } from "./types.js";

export { parseConfigContent } from "./parse.js";
export { loadConfig, readConfigFile, type LoadConfigOptions } from "./load.js";
