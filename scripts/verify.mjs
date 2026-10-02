#!/usr/bin/env node
/**
 * Cross-platform verification script.
 *
 * Runs lint, typecheck, test, build and prettier --check sequentially,
 * exiting with the first non-zero code. Works on Windows, Linux and macOS.
 */

import { spawn } from "node:child_process";

const STEPS = [
  ["pnpm", ["lint"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test"]],
  ["pnpm", ["build"]],
  ["pnpm", ["exec", "prettier", "--check", "."]],
];

async function run(command, args) {
  return new Promise((resolve, reject) => {
    // shell: true is safe here because the command and arguments are hardcoded
    // in this file; no external input reaches the shell.
    const child = spawn(command, args, { stdio: "inherit", shell: true });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`"${command} ${args.join(" ")}" exited with code ${code}`));
      }
    });
  });
}

async function main() {
  for (const [command, args] of STEPS) {
    await run(command, args);
  }
  console.log("\nAll verification steps passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
