import { err, ok, type CommandOutput } from "@devix-cli/output";
import { isStaticWebFramework } from "@devix-cli/project-detector";

import {
  DEFAULT_SERVE_PORT,
  WebError,
  detectWebProject,
  findStaticOutput,
  listEnvVariables,
  listScripts,
} from "./service.js";

interface Ctx {
  argv: readonly string[];
  flags: Readonly<Record<string, unknown>>;
}

function rootOf(flags: Readonly<Record<string, unknown>>): string {
  const cwd = flags["cwd"];
  return typeof cwd === "string" && cwd.length > 0 ? cwd : process.cwd();
}

async function detect(ctx: Ctx): Promise<CommandOutput<unknown>> {
  const detection = await detectWebProject({ root: rootOf(ctx.flags) });

  if (!detection.isWeb) {
    return ok({
      root: detection.root,
      isWeb: false,
      frameworks: [],
      message: "No web framework detected in this project.",
    });
  }

  return ok({
    root: detection.root,
    isWeb: true,
    frameworks: detection.frameworks.map((framework) => ({
      id: framework.id,
      label: framework.label,
      package: framework.package,
      static: isStaticWebFramework(framework.id),
    })),
  });
}

async function env(ctx: Ctx): Promise<CommandOutput<unknown>> {
  const root = rootOf(ctx.flags);
  const detection = await detectWebProject({ root });
  if (!detection.isWeb) {
    return err("ENOT_WEB", WebError.notWeb(root).message);
  }

  const variables = await listEnvVariables({ root });

  return ok({
    root,
    count: variables.length,
    variables,
    note: "Values are never read or shown, only variable names.",
  });
}

async function scripts(ctx: Ctx): Promise<CommandOutput<unknown>> {
  const root = rootOf(ctx.flags);
  const detection = await detectWebProject({ root });
  if (!detection.isWeb) {
    return err("ENOT_WEB", WebError.notWeb(root).message);
  }

  const found = await listScripts({ root });

  return ok({ root, count: found.length, scripts: found });
}

async function serve(ctx: Ctx): Promise<CommandOutput<unknown>> {
  const root = rootOf(ctx.flags);
  const detection = await detectWebProject({ root });
  if (!detection.isWeb) {
    return err("ENOT_WEB", WebError.notWeb(root).message);
  }

  const output = await findStaticOutput({ root });
  if (output === undefined) {
    return err(
      "ENOT_BUILT",
      `No build output found in ${root}. Build the project first (devix web build).`,
    );
  }

  const portFlag = ctx.flags["port"];
  const port = typeof portFlag === "number" ? portFlag : DEFAULT_SERVE_PORT;

  return ok({
    root,
    directory: output.path,
    framework: output.framework,
    port,
    command: `npx serve ${output.path} -l ${port}`,
    note: "Serve is print-first: Devix does not start a server for you.",
  });
}

async function build(ctx: Ctx): Promise<CommandOutput<unknown>> {
  const root = rootOf(ctx.flags);
  const detection = await detectWebProject({ root });
  if (!detection.isWeb) {
    return err("ENOT_WEB", WebError.notWeb(root).message);
  }

  const found = await listScripts({ root });
  const buildScript = found.find((script) => script.name === "build");
  if (buildScript === undefined) {
    return err(
      "ENOBUILD_SCRIPT",
      `No "build" script in ${root}/package.json. Add one and Devix will print the command.`,
    );
  }

  return ok({
    root,
    frameworks: detection.frameworks.map((framework) => framework.label),
    script: buildScript.name,
    command: `npm run ${buildScript.name}`,
    alternative: `pnpm ${buildScript.name}`,
    note: "Build is print-first: drop --run to execute it yourself.",
  });
}

async function doctor(ctx: Ctx): Promise<CommandOutput<unknown>> {
  const root = rootOf(ctx.flags);
  const detection = await detectWebProject({ root });

  if (!detection.isWeb) {
    return ok({
      root,
      isWeb: false,
      checks: [],
      message: "No web framework detected; nothing to diagnose.",
    });
  }

  const found = await listScripts({ root });
  const output = await findStaticOutput({ root });
  const variables = await listEnvVariables({ root });

  const checks = [
    {
      id: "build-script",
      name: "build script",
      status: found.some((script) => script.name === "build") ? "ok" : "warn",
      ...(found.some((script) => script.name === "build")
        ? {}
        : { detail: "No build script in package.json" }),
    },
    {
      id: "dev-script",
      name: "dev script",
      status: found.some((script) => script.name === "dev") ? "ok" : "warn",
      ...(found.some((script) => script.name === "dev")
        ? {}
        : { detail: "No dev script in package.json" }),
    },
    {
      id: "build-output",
      name: "build output",
      status: output === undefined ? "warn" : "ok",
      ...(output === undefined ? { detail: "Not built yet" } : { detail: output.path }),
    },
    {
      id: "env-vars",
      name: "environment variables",
      status: variables.length === 0 ? "warn" : "ok",
      detail:
        variables.length === 0
          ? "No .env file found; check whether one is required"
          : `${String(variables.length)} declared`,
    },
  ] as const;

  return ok({
    root,
    isWeb: true,
    frameworks: detection.frameworks.map((framework) => framework.label),
    checks,
  });
}

/** Web command handlers contributed via plugin capabilities. */
export const commandHandlers: Record<string, (ctx: Ctx) => Promise<CommandOutput<unknown>>> = {
  web: async (ctx) => {
    const subcommand = ctx.argv[0];

    switch (subcommand) {
      case "detect":
        return detect(ctx);
      case "env":
        return env(ctx);
      case "scripts":
        return scripts(ctx);
      case "serve":
        return serve(ctx);
      case "build":
        return build(ctx);
      case "doctor":
        return doctor(ctx);
      default:
        return err("EUNKNOWN_SUBCOMMAND", `Unknown web subcommand: ${String(subcommand)}`);
    }
  },
};
