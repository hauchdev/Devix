import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const binPath = join(cliRoot, "bin", "run.js");

async function runCli(
  args: string[],
  cwd?: string,
  stdin?: string,
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [binPath, ...args], {
    cwd: cwd ?? cliRoot,
    encoding: "utf8",
    ...(stdin === undefined ? {} : { input: stdin }),
  });
}

describe("devix CLI (compiled binary)", () => {
  it("prints the version with --version", async () => {
    const { stdout } = await runCli(["--version"]);

    expect(stdout).toMatch(/^devix-cli\/\d+\.\d+\.\d+/);
  });

  it("prints usage with --help", async () => {
    const { stdout } = await runCli(["--help"]);

    expect(stdout).toContain("USAGE");
    expect(stdout).toContain("$ devix [COMMAND]");
    expect(stdout).toContain("detect");
  });

  it("detects the CLI's own package from its directory", async () => {
    const { stdout } = await runCli(["detect", "--json"]);

    const parsed = JSON.parse(stdout) as {
      root: string;
      isProject: boolean;
      languages: string[];
      packageManagers: string[];
      tools: string[];
    };
    expect(parsed.isProject).toBe(true);
    expect(parsed.languages).toContain("node");
    expect(parsed.languages).toContain("typescript");
  });

  it("reports no project markers in an empty temporary directory", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-empty-"));
    try {
      const { stdout } = await runCli(["detect", "--json"], empty);

      const parsed = JSON.parse(stdout) as { isProject: boolean };
      expect(parsed.isProject).toBe(false);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });

  it("doctor prints an environment section with node present", async () => {
    const { stdout } = await runCli(["doctor"]);

    expect(stdout).toContain("Environment:");
    expect(stdout).toMatch(/✓ Node\.js \d+\.\d+/);
    expect(stdout).toContain("Project:");
  });

  it("doctor --json emits parseable report", async () => {
    const { stdout } = await runCli(["doctor", "--json"]);

    const parsed = JSON.parse(stdout) as {
      environment: { checks: { id: string; status: string }[] };
      project: { isProject: boolean };
    };
    const ids = parsed.environment.checks.map((c) => c.id);
    expect(ids).toEqual(["node", "pnpm", "npm", "yarn", "bun", "git"]);
    const node = parsed.environment.checks.find((c) => c.id === "node");
    expect(node?.status).toBe("ok");
  }, 30_000);

  it("doctor reports an empty directory without error", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-doctor-empty-"));
    try {
      const { stdout } = await runCli(["doctor", "--json"], empty);

      const parsed = JSON.parse(stdout) as { project: { isProject: boolean } };
      expect(parsed.project.isProject).toBe(false);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  }, 30_000);

  it("git status shows the branch of this repository", async () => {
    const { stdout } = await runCli(["git", "status"]);

    expect(stdout).toMatch(/Branch: \S+/);
  });

  it("git branches marks the current branch", async () => {
    const { stdout } = await runCli(["git", "branches"]);

    expect(stdout).toMatch(/^\* main /m);
  });

  it("git outside a repository fails with a clear message", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-git-empty-"));
    try {
      await expect(runCli(["git", "status"], empty)).rejects.toThrow(/not a git repository/i);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  }, 30_000);

  it("status combines project, environment, git and docker", async () => {
    const { stdout } = await runCli(["status"]);

    expect(stdout).toContain("Project:");
    expect(stdout).toContain("Environment:");
    expect(stdout).toContain("Git:");
    expect(stdout).toContain("Docker:");
  }, 30_000);

  it("status --json emits all sections parseable", async () => {
    const { stdout } = await runCli(["status", "--json"]);

    const parsed = JSON.parse(stdout) as {
      project: unknown;
      environment: unknown;
      git: unknown;
      docker: unknown;
    };
    expect(parsed.project).toBeDefined();
    expect(parsed.environment).toBeDefined();
    expect(parsed.git).toBeDefined();
    expect(parsed.docker).toBeDefined();
  }, 30_000);

  it("minecraft check reports no platforms outside Minecraft projects", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const empty = await mkdtemp(join(tmpdir(), "devix-cli-check-empty-"));
    try {
      const { stdout } = await runCli(["minecraft", "check", "--json"], empty);

      const parsed = JSON.parse(stdout) as { isMinecraft: boolean; platforms: unknown[] };
      expect(parsed.isMinecraft).toBe(false);
      expect(parsed.platforms).toEqual([]);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft check detects a scaffolded fabric project and honors the requested platform", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-check-fabric-"));
    try {
      await runCli(["minecraft", "init", "fabric", "CheckMod", "--here"], dir);

      const { stdout } = await runCli(["minecraft", "check", "--json"], dir);
      const parsed = JSON.parse(stdout) as {
        isMinecraft: boolean;
        platforms: { id: string; detail: string }[];
        requested?: { id: string; detected: boolean };
      };
      expect(parsed.isMinecraft).toBe(true);
      expect(parsed.platforms[0]?.id).toBe("fabric");
      expect(parsed.platforms[0]?.detail).toBe("checkmod");

      const requested = await runCli(["minecraft", "check", "fabric", "--json"], dir);
      const requestedParsed = JSON.parse(requested.stdout) as {
        requested: { id: string; detected: boolean };
      };
      expect(requestedParsed.requested).toEqual({ id: "fabric", detected: true });

      const human = await runCli(["minecraft", "check"], dir);
      expect(human.stdout).toContain("✓ fabric");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft check rejects unknown platforms with a clear message", async () => {
    await expect(runCli(["minecraft", "check", "wurm"])).rejects.toThrow(/Unknown platform/i);
  }, 30_000);

  it("minecraft run prints the launch command for a scaffolded project", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-run-fabric-"));
    try {
      await runCli(["minecraft", "init", "fabric", "RunMod", "--here"], dir);

      const { stdout } = await runCli(["minecraft", "run"], dir);
      expect(stdout).toContain("Run with:");
      expect(stdout).toContain("runClient");
      expect(stdout).toContain("Project root:");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft init without args on a non-interactive stream fails with the usage message", async () => {
    const { mkdtemp, readdir, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-init-eof-"));
    try {
      await expect(runCli(["minecraft", "init", "--here"], dir, "")).rejects.toThrow(
        /init requires a platform and a name/i,
      );
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft init normalizes oclif's piped-stdin arg leakage into the missing-args error", async () => {
    // oclif v5 stuffs piped stdin into the first missing positional
    // arg; the command must reject that multi-line "platform" instead
    // of scaffolding from garbage or hanging.
    const { mkdtemp, readdir, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-init-pipe-"));
    try {
      await expect(
        runCli(["minecraft", "init", "--here"], dir, "fabric\nPiped Mod\n"),
      ).rejects.toThrow(/init requires a platform and a name/i);
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft init --json refuses to prompt and demands the arguments", async () => {
    await expect(runCli(["minecraft", "init", "--json"])).rejects.toThrow(
      /--json requires the platform/i,
    );
  }, 30_000);

  it("minecraft init scaffolds a multi-loader fabric+forge project with --mc", async () => {
    const { mkdtemp, readFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-init-multiloader-"));
    try {
      await runCli(
        ["minecraft", "init", "fabric+forge", "DualMod", "--here", "--mc", "1.21.1"],
        dir,
      );

      const fabricBuild = await readFile(join(dir, "fabric/build.gradle"), "utf8");
      expect(fabricBuild).toContain("fabric-loom");
      const shared = await readFile(join(dir, "gradle.properties"), "utf8");
      expect(shared).toContain("minecraft_version=1.21.1");
      expect(shared).toContain("fabric_loader=");
      expect(shared).toContain("forge_version=");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft init scaffolds a multi-module paper project with --modules", async () => {
    const { mkdtemp, readFile, readdir, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-init-multimodule-"));
    try {
      const { stdout } = await runCli(
        ["minecraft", "init", "paper", "QueueBoard", "--here", "--modules", "api,core"],
        dir,
      );

      expect(stdout).toContain("modules: main, api, core");
      const settings = await readFile(join(dir, "settings.gradle"), "utf8");
      expect(settings).toContain("include ':api'");
      expect(await readFile(join(dir, "api/build.gradle"), "utf8")).toContain("java-library");
      expect(await readdir(join(dir, "core"))).toContain("src");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft init --kind resolves the default platform of the kind", async () => {
    const { mkdtemp, readFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-init-kind-"));
    try {
      const { stdout } = await runCli(
        ["minecraft", "init", "--kind", "proxy-plugin", "Relay", "--here"],
        dir,
      );

      expect(stdout).toContain("kind: proxy-plugin");
      expect(stdout).toContain("platform: velocity");
      expect(await readFile(join(dir, "build.gradle"), "utf8")).toContain("velocity-api");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("minecraft list shows the kinds, platforms and modules", async () => {
    const { stdout } = await runCli(["minecraft", "list"]);

    expect(stdout).toContain("Project kinds:");
    expect(stdout).toContain("neoforge");
    expect(stdout).toContain("Optional modules:");
  }, 30_000);

  it("web detect reports no framework outside web projects", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-empty-"));
    try {
      const { stdout } = await runCli(["web", "detect", "--json"], dir);

      const parsed = JSON.parse(stdout) as { isWeb: boolean; frameworks: unknown[] };
      expect(parsed.isWeb).toBe(false);
      expect(parsed.frameworks).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("web detect lists the framework of a Next.js project", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-next-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ name: "app", dependencies: { next: "15.0.0" } }),
        "utf8",
      );

      const { stdout } = await runCli(["web", "detect"], dir);
      expect(stdout).toContain("Frameworks:");
      expect(stdout).toContain("next");
      expect(stdout).toContain("Next.js");

      const asJson = await runCli(["web", "detect", "--json"], dir);
      const parsed = JSON.parse(asJson.stdout) as {
        isWeb: boolean;
        frameworks: { id: string; static: boolean }[];
      };
      expect(parsed.isWeb).toBe(true);
      expect(parsed.frameworks[0]?.id).toBe("next");
      expect(parsed.frameworks[0]?.static).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("web env lists variable names without their values", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-env-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { next: "15.0.0" } }),
        "utf8",
      );
      await writeFile(join(dir, ".env"), "API_TOKEN=super-secret-value\n", "utf8");

      const { stdout } = await runCli(["web", "env"], dir);

      expect(stdout).toContain("API_TOKEN");
      expect(stdout).not.toContain("super-secret-value");
      expect(stdout).toContain("only variable names");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("web scripts lists the declared scripts", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-scripts-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({
          dependencies: { next: "15.0.0" },
          scripts: { dev: "next dev", build: "next build" },
        }),
        "utf8",
      );

      const { stdout } = await runCli(["web", "scripts"], dir);

      expect(stdout).toContain("dev");
      expect(stdout).toContain("next dev");
      expect(stdout).toContain("build");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("web build prints the command without executing it", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-build-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { next: "15.0.0" }, scripts: { build: "next build" } }),
        "utf8",
      );

      const { stdout } = await runCli(["web", "build"], dir);

      expect(stdout).toContain("npm run build");
      expect(stdout).toContain("print-first");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("web serve reports a missing build and a detected one", async () => {
    const { mkdir, mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-serve-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { astro: "5.0.0" }, scripts: { build: "astro build" } }),
        "utf8",
      );

      await expect(runCli(["web", "serve"], dir)).rejects.toThrow(/No build output/i);

      await mkdir(join(dir, "dist"), { recursive: true });
      const { stdout } = await runCli(["web", "serve", "--port", "5000"], dir);
      expect(stdout).toContain("5000");
      expect(stdout).toContain("dist");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("web doctor checks scripts, output and env vars", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-web-doctor-"));
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { astro: "5.0.0" }, scripts: { build: "astro build" } }),
        "utf8",
      );

      const { stdout } = await runCli(["web", "doctor"], dir);

      expect(stdout).toContain("Web:");
      expect(stdout).toContain("build script");
      expect(stdout).toContain("dev script");
      expect(stdout).toContain("Not built yet");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("web rejects unknown operations and non-web projects", async () => {
    await expect(runCli(["web", "nope"])).rejects.toThrow();
    await expect(runCli(["web", "env", "--json"])).rejects.toThrow(/No web framework/i);
  }, 30_000);

  it("config path prints the default config location", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-config-path-"));
    try {
      const { stdout } = await runCli(["config", "path"], dir);

      expect(stdout.trim()).toBe(join(dir, "devix.config.json"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("config set writes a value that config get and list read back", async () => {
    const { mkdtemp, readFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-config-set-"));
    try {
      await runCli(["config", "set", "name", "demo-project"], dir);
      await runCli(["config", "set", "features.doctor", "false"], dir);

      const written = JSON.parse(await readFile(join(dir, "devix.config.json"), "utf8")) as {
        name: string;
        features: { doctor: boolean };
      };
      expect(written).toEqual({ name: "demo-project", features: { doctor: false } });

      const got = await runCli(["config", "get", "features.doctor"], dir);
      expect(got.stdout.trim()).toBe("false");

      const listed = await runCli(["config", "list", "--json"], dir);
      const parsed = JSON.parse(listed.stdout) as {
        config: Record<string, unknown>;
      };
      expect(parsed.config).toEqual({ name: "demo-project", "features.doctor": false });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("config rejects unknown keys and missing arguments", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-config-bad-"));
    try {
      await expect(runCli(["config", "get"], dir)).rejects.toThrow(/get requires a key/i);
      await expect(runCli(["config", "get", "nope"], dir)).rejects.toThrow(/Unknown config key/i);
      await expect(runCli(["config", "set", "nope", "1"], dir)).rejects.toThrow(/unknown key/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("doctor lists the Minecraft section only when platforms are detected", async () => {
    const { mkdtemp, mkdir, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const dir = await mkdtemp(join(tmpdir(), "devix-cli-doctor-mc-"));
    try {
      const plain = await runCli(["doctor"], dir);
      expect(plain.stdout).not.toContain("Minecraft:");

      const resources = join(dir, "src", "main", "resources");
      await mkdir(resources, { recursive: true });
      await writeFile(join(resources, "paper-plugin.yml"), "name: DoctorMc\n", "utf8");

      const withMc = await runCli(["doctor"], dir);
      expect(withMc.stdout).toContain("Minecraft: bukkit (DoctorMc)");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
