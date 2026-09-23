import { ShellError } from "./errors.js";

const CMD_SHIM_EXTENSIONS = new Set([".cmd", ".bat"]);

const CMD_METACHARACTERS = /[&|<>()^%!"]/;

export function isCmdShim(executablePath: string): boolean {
  const lower = executablePath.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot === -1) {
    return false;
  }
  return CMD_SHIM_EXTENSIONS.has(lower.slice(dot));
}

export function hasCmdMetacharacters(argument: string): boolean {
  return CMD_METACHARACTERS.test(argument);
}

export function assertSafeCmdArgs(command: string, args: readonly string[]): void {
  for (const argument of args) {
    if (hasCmdMetacharacters(argument)) {
      throw ShellError.unsafeArg(command, argument);
    }
  }
}
