import { createDefaultRegistry, type DetectorRegistry } from "@devix/project-detector";

import { checkEnvironment } from "./environment.js";
import { defaultServices } from "./defaults.js";
import { checkProject } from "./project.js";
import type { DoctorReport, DoctorServices } from "./types.js";

export interface RunDoctorOptions {
  /** Directory whose project is inspected. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Detector registry to use. Defaults to `createDefaultRegistry()`. */
  registry?: DetectorRegistry;
  /**
   * Injectable tool-version resolver. Defaults to probing real
   * executables via `@devix/shell` (see `defaultServices`).
   */
  services?: DoctorServices;
}

/**
 * Runs the full doctor diagnosis: environment checks plus a project
 * inspection. Pure service: no printing, no process exit codes.
 */
export async function runDoctor(options: RunDoctorOptions = {}): Promise<DoctorReport> {
  const services = options.services ?? defaultServices;
  const registry = options.registry ?? createDefaultRegistry();
  const cwd = options.cwd ?? process.cwd();

  const [environment, project] = await Promise.all([
    checkEnvironment(services),
    checkProject(registry, cwd),
  ]);

  return { environment: { checks: environment }, project };
}
