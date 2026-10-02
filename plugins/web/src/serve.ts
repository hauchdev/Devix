import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

import { WebError } from "./service.js";

/** Options for `serveStatic`. */
export interface ServeStaticOptions {
  /** Absolute directory to serve. */
  readonly root: string;
  /** Port to listen on. */
  readonly port: number;
}

/** A running static file server. */
export interface StaticServer {
  /** The port actually bound (may differ when 0 is requested). */
  readonly port: number;
  /** Stops the server and releases the port. */
  close(): Promise<void>;
}

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".htm": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

/** Resolves the request path to a file inside `root`, or rejects it. */
function resolveRequestPath(root: string, urlPath: string): string {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const normalized = normalize(decoded).replace(/^([/\\])+/, "");

  const candidate = resolve(join(root, normalized));
  const rootWithSep = root.endsWith(sep) ? root : `${root}${sep}`;

  // Path traversal guard: the resolved path must stay inside root.
  if (candidate !== root && !candidate.startsWith(rootWithSep)) {
    throw WebError.invalid(`Path escapes the served directory: ${decoded}`);
  }

  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const index = join(candidate, "index.html");
    if (existsSync(index)) {
      return index;
    }
  }

  return candidate;
}

function contentTypeOf(path: string): string {
  return CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Starts a minimal static file server for a built web project.
 *
 * Deliberately dependency-free and read-only: it serves files from one
 * directory, refuses paths that escape it, and never executes anything.
 * Callers print the URL and stop the server themselves.
 */
export function serveStatic(options: ServeStaticOptions): Promise<StaticServer> {
  const root = resolve(options.root);

  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return Promise.reject(WebError.invalid(`Not a directory: ${root}`));
  }

  const server: Server = createServer((request, response) => {
    const urlPath = request.url ?? "/";

    let filePath: string;
    try {
      filePath = resolveRequestPath(root, urlPath);
    } catch {
      response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": contentTypeOf(filePath),
      "cache-control": "no-cache",
    });
    createReadStream(filePath).pipe(response);
  });

  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(options.port, () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : options.port;
      resolvePromise({
        port,
        close: () =>
          new Promise<void>((done, fail) => {
            server.close((error) => (error === undefined ? done() : fail(error)));
          }),
      });
    });
  });
}
