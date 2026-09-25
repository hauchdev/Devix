/** Outcome of a single doctor check. */
export type CheckStatus = "ok" | "missing" | "warn";

/** Result of one diagnostic check. */
export interface CheckResult {
  /** Stable check id, e.g. "node". */
  readonly id: string;
  /** Human-readable label, e.g. "Node.js". */
  readonly name: string;
  /** Outcome of the check. */
  readonly status: CheckStatus;
  /** Detected version or detail, when available. */
  readonly detail?: string;
}

/** The environment section of a doctor report. */
export interface EnvironmentReport {
  readonly checks: readonly CheckResult[];
}

/** The project section of a doctor report. */
export interface ProjectReport {
  /** Absolute path of the inspected project root. */
  readonly root: string;
  /** True when project markers were found. */
  readonly isProject: boolean;
  /** Detected stack ids grouped by category. */
  readonly languages: readonly string[];
  readonly packageManagers: readonly string[];
  readonly tools: readonly string[];
}

/** Full result of a doctor run. */
export interface DoctorReport {
  readonly environment: EnvironmentReport;
  readonly project: ProjectReport;
}

/** How the doctor resolves tool versions. Injectable for tests. */
export interface DoctorServices {
  /**
   * Returns the version of a tool (e.g. "node --version"), or
   * `undefined` when the tool is missing or reports nothing.
   */
  getToolVersion(tool: string, versionArg: string): Promise<string | undefined>;
}
