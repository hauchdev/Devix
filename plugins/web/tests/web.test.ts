import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_SERVE_PORT,
  detectWebProject,
  findStaticOutput,
  listEnvVariables,
  listScripts,
  serveStatic,
} from "../src/index.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devix-web-"));
  tempDirs.push(dir);
  return dir;
}

async function writeProject(
  dir: string,
  packageJson: unknown,
  extra: Readonly<Record<string, string>> = {},
): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "package.json"), JSON.stringify(packageJson), "utf8");
  for (const [name, content] of Object.entries(extra)) {
    await writeFile(join(dir, name), content, "utf8");
  }
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** Sends a request path verbatim and returns the response status. */
function rawRequest(port: number, path: string): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const req = httpRequest({ host: "127.0.0.1", port, path, method: "GET" }, (response) => {
      response.resume();
      response.once("end", () => resolvePromise(response.statusCode ?? 0));
    });
    req.once("error", reject);
    req.end();
  });
}

describe("detectWebProject", () => {
  it("reports isWeb false for a directory without a package.json", async () => {
    const dir = await makeTempDir();

    const detection = await detectWebProject({ root: dir });

    expect(detection.isWeb).toBe(false);
  });

  it("detects Next.js", async () => {
    const dir = await makeTempDir();
    await writeProject(dir, { dependencies: { next: "15.0.0" } });

    const detection = await detectWebProject({ root: dir });

    expect(detection.frameworks.map((f) => f.id)).toEqual(["next"]);
  });
});

describe("listEnvVariables", () => {
  it("returns variable names without their values", async () => {
    const dir = await makeTempDir();
    await writeProject(
      dir,
      { dependencies: { next: "15.0.0" } },
      {
        ".env": "DATABASE_URL=postgres://user:secret@host/db\nAPI_TOKEN=super-secret\n",
      },
    );

    const variables = await listEnvVariables({ root: dir });

    expect(variables.map((v) => v.name)).toEqual(["API_TOKEN", "DATABASE_URL"]);
    expect(variables[0]?.value).toBeUndefined();
    expect(JSON.stringify(variables)).not.toContain("super-secret");
    expect(JSON.stringify(variables)).not.toContain("postgres://");
  });

  it("ignores comments and blank lines and handles the export prefix", async () => {
    const dir = await makeTempDir();
    await writeProject(dir, {}, { ".env": "# comment\n\nexport TOKEN=abc\n  \n" });

    const variables = await listEnvVariables({ root: dir });

    expect(variables.map((v) => v.name)).toEqual(["TOKEN"]);
  });

  it("merges multiple env files without duplicates", async () => {
    const dir = await makeTempDir();
    await writeProject(
      dir,
      {},
      {
        ".env": "SHARED=1\nONLY_ENV=1\n",
        ".env.local": "SHARED=2\nONLY_LOCAL=1\n",
      },
    );

    const variables = await listEnvVariables({ root: dir });

    expect(variables.map((v) => v.name)).toEqual(["ONLY_ENV", "ONLY_LOCAL", "SHARED"]);
    expect(variables.find((v) => v.name === "SHARED")?.source).toBe(".env");
  });

  it("returns an empty list when there is no env file", async () => {
    const dir = await makeTempDir();

    expect(await listEnvVariables({ root: dir })).toEqual([]);
  });
});

describe("listScripts", () => {
  it("lists scripts sorted by name", async () => {
    const dir = await makeTempDir();
    await writeProject(dir, {
      scripts: { dev: "next dev", build: "next build", start: "next start" },
    });

    const scripts = await listScripts({ root: dir });

    expect(scripts.map((s) => s.name)).toEqual(["build", "dev", "start"]);
    expect(scripts[1]?.command).toBe("next dev");
  });

  it("returns an empty list when there are no scripts", async () => {
    const dir = await makeTempDir();
    await writeProject(dir, { name: "app" });

    expect(await listScripts({ root: dir })).toEqual([]);
  });

  it("tolerates a malformed package.json", async () => {
    const dir = await makeTempDir();
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "package.json"), "{ broken", "utf8");

    expect(await listScripts({ root: dir })).toEqual([]);
  });
});

describe("findStaticOutput", () => {
  it("finds dist for Astro", async () => {
    const dir = await makeTempDir();
    await writeProject(dir, { dependencies: { astro: "5.0.0" } });
    await mkdir(join(dir, "dist"), { recursive: true });

    const output = await findStaticOutput({ root: dir });

    expect(output?.path).toBe(join(dir, "dist"));
    expect(output?.framework).toBe("Astro");
  });

  it("finds public for Gatsby", async () => {
    const dir = await makeTempDir();
    await writeProject(dir, { dependencies: { gatsby: "5.0.0" } });
    await mkdir(join(dir, "public"), { recursive: true });

    const output = await findStaticOutput({ root: dir });

    expect(output?.path).toBe(join(dir, "public"));
  });

  it("returns undefined when the project is not built", async () => {
    const dir = await makeTempDir();
    await writeProject(dir, { dependencies: { next: "15.0.0" } });

    expect(await findStaticOutput({ root: dir })).toBeUndefined();
  });

  it("returns undefined for a non-web project", async () => {
    const dir = await makeTempDir();

    expect(await findStaticOutput({ root: dir })).toBeUndefined();
  });
});

describe("serveStatic", () => {
  it("serves index.html and files with a content type", async () => {
    const dir = await makeTempDir();
    await mkdir(join(dir, "assets"), { recursive: true });
    await writeFile(join(dir, "index.html"), "<h1>hi</h1>", "utf8");
    await writeFile(join(dir, "assets", "app.css"), "body{}", "utf8");

    const server = await serveStatic({ root: dir, port: 0 });
    try {
      const index = await fetch(`http://127.0.0.1:${server.port}/`);
      expect(index.status).toBe(200);
      expect(index.headers.get("content-type")).toContain("text/html");
      expect(await index.text()).toContain("hi");

      const css = await fetch(`http://127.0.0.1:${server.port}/assets/app.css`);
      expect(css.headers.get("content-type")).toContain("text/css");
    } finally {
      await server.close();
    }
  });

  it("returns 404 for a missing file", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "index.html"), "hi", "utf8");

    const server = await serveStatic({ root: dir, port: 0 });
    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/nope.html`);
      expect(response.status).toBe(404);
    } finally {
      await server.close();
    }
  });

  it("refuses to serve paths outside the root", async () => {
    const dir = await makeTempDir();
    const site = join(dir, "site");
    await mkdir(site, { recursive: true });
    await writeFile(join(site, "index.html"), "hi", "utf8");
    // The secret lives next to the served directory, not inside it.
    await writeFile(join(dir, "secret.txt"), "top secret", "utf8");

    const server = await serveStatic({ root: site, port: 0 });
    try {
      // http.request sends the path verbatim; fetch would normalize the
      // traversal away before it ever reached the server.
      const status = await rawRequest(server.port, "/../secret.txt");
      expect(status).toBeGreaterThanOrEqual(400);

      const encoded = await rawRequest(server.port, "/%2e%2e%2fsecret.txt");
      expect(encoded).toBeGreaterThanOrEqual(400);

      const deep = await rawRequest(server.port, "/../../../../../../etc/passwd");
      expect(deep).toBeGreaterThanOrEqual(400);
    } finally {
      await server.close();
    }
  });

  it("rejects a root that is not a directory", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "file.txt");
    await writeFile(file, "x", "utf8");

    await expect(serveStatic({ root: file, port: 0 })).rejects.toThrow(/Not a directory/i);
  });

  it("exposes a default port", () => {
    expect(DEFAULT_SERVE_PORT).toBeGreaterThan(0);
  });
});
