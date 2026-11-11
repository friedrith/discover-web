/**
 * Server entry, loaded by `server.ts` (with `ssrLoadModule` in development,
 * from `dist/server` in production).
 */
import { StrictMode, type ReactNode } from "react";
import {
  type RenderToPipeableStreamOptions,
  renderToPipeableStream,
} from "react-dom/server";
import {
  StaticRouterProvider,
  createStaticHandler,
  createStaticRouter,
} from "react-router";
import { metaFromMatches, renderHeadTags } from "./meta.ts";
import { errorTitle, routes } from "./routes.tsx";
import { ServerFnError } from "./shared/errors.ts";

const handler = createStaticHandler(routes);

export type RenderResult =
  | { kind: "response"; response: Response }
  | { kind: "page"; status: number; head: string; app: ReactNode };

/**
 * Runs the loaders (and the action, for a form post) for this request, then
 * returns the React tree to stream, or a redirect.
 */
export async function render(request: Request): Promise<RenderResult> {
  const context = await handler.query(request);
  if (context instanceof Response)
    return { kind: "response", response: context };

  const router = createStaticRouter(handler.dataRoutes, context);
  const meta = metaFromMatches(
    context.matches.map((m) => ({
      handle: m.route.handle,
      data: context.loaderData[m.route.id],
    })),
    context.errors ? errorTitle(context.statusCode) : undefined,
  );

  return {
    kind: "page",
    status: context.statusCode,
    head: renderHeadTags(meta),
    app: (
      <StrictMode>
        <StaticRouterProvider router={router} context={context} />
      </StrictMode>
    ),
  };
}

export function renderToStream(
  app: ReactNode,
  options: RenderToPipeableStreamOptions,
) {
  return renderToPipeableStream(app, options);
}

type RpcResult = { status: number; body: { data?: unknown; error?: string } };

/** `POST /_rpc/:name` with a JSON array of arguments. */
export async function handleRpc(
  name: string,
  args: unknown,
): Promise<RpcResult> {
  // Same import as in src/api.ts, so the module is loaded once, in one chunk.
  const { serverFunctions } = await import("./server/functions.ts");
  if (!Object.hasOwn(serverFunctions, name)) {
    return { status: 404, body: { error: "Unknown server function" } };
  }
  if (!Array.isArray(args))
    return { status: 400, body: { error: "Invalid input" } };
  const fn = serverFunctions[name as keyof typeof serverFunctions] as (
    ...a: unknown[]
  ) => Promise<unknown>;
  try {
    return { status: 200, body: { data: await fn(...args) } };
  } catch (error) {
    if (error instanceof ServerFnError)
      return { status: 400, body: { error: error.message } };
    console.error(error);
    return {
      status: 500,
      body: { error: "Something went wrong on the server" },
    };
  }
}
