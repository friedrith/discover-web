/**
 * The HTTP server. Express handles three things:
 *
 * - static assets (Vite's dev middleware in development, `dist/client/assets` in production)
 * - `POST /_rpc/:name`: the endpoint behind the server functions in `src/api.ts`
 * - every other request: server-side render through `src/entry-server.tsx`
 *
 * In development, Vite runs in middleware mode and loads the server entry with
 * `ssrLoadModule`, so edits apply on the next request without a restart.
 */
import fs from "node:fs/promises";
import { Transform } from "node:stream";
import express from "express";
import type { ViteDevServer } from "vite";

type ServerEntry = typeof import("./src/entry-server.tsx");

const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3200);
const host = process.env.HOST ?? "127.0.0.1";
const ABORT_AFTER_MS = 10_000;

const app = express();
app.disable("x-powered-by");

let vite: ViteDevServer | undefined;
let productionTemplate = "";
let productionEntry: ServerEntry | undefined;

if (isProduction) {
  const compression = (await import("compression")).default;
  const sirv = (await import("sirv")).default;
  app.use(compression());
  // Hashed file names, so they can be cached forever.
  app.use(
    "/assets",
    sirv("dist/client/assets", { immutable: true, maxAge: 31_536_000 }),
  );
  productionTemplate = await fs.readFile("dist/client/index.html", "utf-8");
  const entryPath = new URL("./dist/server/entry-server.js", import.meta.url)
    .href;
  productionEntry = (await import(/* @vite-ignore */ entryPath)) as ServerEntry;
} else {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);
}

async function loadEntry(): Promise<ServerEntry> {
  if (productionEntry) return productionEntry;
  return (await vite!.ssrLoadModule("/src/entry-server.tsx")) as ServerEntry;
}

async function loadTemplate(url: string): Promise<string> {
  if (!vite) return productionTemplate;
  const html = await fs.readFile("index.html", "utf-8");
  return vite.transformIndexHtml(url, html);
}

// Server functions called from the browser.
app.post(
  "/_rpc/:name",
  express.json({ limit: "16kb" }),
  async (req, res, next) => {
    try {
      const entry = await loadEntry();
      const { status, body } = await entry.handleRpc(req.params.name, req.body);
      res.status(status).json(body);
    } catch (error) {
      next(error);
    }
  },
);

// HTML form posts, for when JavaScript is off or not loaded yet.
app.use(
  express.raw({ type: "application/x-www-form-urlencoded", limit: "16kb" }),
);

app.use(async (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "POST") {
    res.status(405).end();
    return;
  }
  try {
    const url = new URL(
      req.originalUrl,
      `http://${req.headers.host ?? "localhost"}`,
    );
    const template = await loadTemplate(req.originalUrl);
    const entry = await loadEntry();
    const result = await entry.render(toFetchRequest(req, url));

    if (result.kind === "response") {
      // A redirect, typically after a form post (Post/Redirect/Get).
      res.status(result.response.status);
      result.response.headers.forEach((value, key) =>
        res.setHeader(key, value),
      );
      res.end(await result.response.text());
      return;
    }

    const [head, tail] = template
      .replace("<!--app-head-->", result.head)
      .split("<!--app-html-->");
    let failed = false;
    const { pipe, abort } = entry.renderToStream(result.app, {
      onShellReady() {
        res.status(failed ? 500 : result.status);
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.write(head);
        const body = new Transform({
          transform(chunk, encoding, callback) {
            res.write(chunk, encoding);
            callback();
          },
        });
        body.on("finish", () => res.end(tail));
        pipe(body);
      },
      onShellError(error) {
        vite?.ssrFixStacktrace(error as Error);
        console.error(error);
        res.status(500).setHeader("content-type", "text/html; charset=utf-8");
        res.end("<h1>Something went wrong</h1>");
      },
      onError(error) {
        failed = true;
        console.error(error);
      },
    });
    setTimeout(abort, ABORT_AFTER_MS).unref();
  } catch (error) {
    vite?.ssrFixStacktrace(error as Error);
    next(error);
  }
});

app.listen(port, host, () => {
  console.log(
    `Listening on http://${host}:${port} (${isProduction ? "production" : "development"})`,
  );
});

/** Express request -> Fetch API `Request`, which is what React Router's static handler takes. */
function toFetchRequest(req: express.Request, url: URL): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value])
      headers.append(key, v);
  }
  // Cancels the loaders if the browser goes away before the page is ready.
  const controller = new AbortController();
  req.res?.on("close", () => {
    if (!req.res?.writableFinished) controller.abort();
  });
  const hasBody = req.method === "POST" && Buffer.isBuffer(req.body);
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? new Uint8Array(req.body as Buffer) : undefined,
    signal: controller.signal,
  });
}
