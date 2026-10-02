import type { UserConfig } from "vitest/config";

/**
 * Shared Vitest configuration for every workspace package.
 *
 * Packages opt in with a two-line `vitest.config.ts` that spreads this
 * and overrides only what is genuinely package-specific. Coverage
 * floors live here so they ratchet in one place instead of drifting
 * package by package.
 */

/**
 * Coverage floor per package, as a percentage.
 *
 * These are deliberately honest rather than uniform. A floor nobody
 * meets is theatre; a floor nobody can drop without noticing is what
 * actually protects the code.
 *
 * `devix-cli` is the exception worth explaining: its tests drive the
 * compiled binary as a subprocess, so v8 in-process coverage cannot see
 * the code those tests exercise. Its floor is therefore measured on
 * what a subprocess can reach, and the package is verified end-to-end
 * instead.
 */
export const COVERAGE_FLOORS: Readonly<Record<string, number>> = {
  "@devix-cli/cache": 85,
  "@devix-cli/config": 90,
  "@devix-cli/core": 75,
  "@devix-cli/deps": 75,
  "@devix-cli/doctor": 80,
  "@devix-cli/docker": 90,
  "@devix-cli/filesystem": 90,
  "@devix-cli/git": 85,
  "@devix-cli/logger": 100,
  "@devix-cli/minecraft": 70,
  "@devix-cli/output": 100,
  "@devix-cli/project-detector": 90,
  "@devix-cli/shell": 90,
  "@devix-cli/ui": 80,
  "@devix-cli/web": 50,
  "devix-cli": 10,
};

/**
 * Builds the shared test configuration.
 *
 * @param name Package name, used to look up its coverage floor.
 * @returns A Vitest config fragment.
 */
export function sharedTestConfig(name: string): UserConfig {
  const floor = COVERAGE_FLOORS[name] ?? 0;

  return {
    test: {
      include: ["tests/**/*.test.ts"],
      environment: "node",
      // Windows runners are noticeably slower to spawn processes, and
      // the CLI tests spawn the compiled binary once per case.
      testTimeout: 30_000,
      hookTimeout: 30_000,
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        reportsDirectory: "./coverage",
        // Only the source under test: templates and generated files are
        // verified by asserting on their output, not by executing them.
        include: ["src/**/*.ts"],
        thresholds:
          floor > 0
            ? {
                lines: floor,
                functions: floor,
                branches: Math.max(50, floor - 10),
                statements: floor,
              }
            : undefined,
      },
    },
  };
}
