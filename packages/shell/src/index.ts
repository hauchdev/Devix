export { ShellError } from "./errors.js";
export type { ShellErrorCode } from "./errors.js";

export { which, commandExists } from "./which.js";
export { isCmdShim, hasCmdMetacharacters, assertSafeCmdArgs } from "./windows.js";
export { runCommand, type RunCommandOptions, type CommandResult } from "./run.js";
