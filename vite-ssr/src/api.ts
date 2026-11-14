/**
 * Calls a server function from anywhere: a loader, an action or a component.
 *
 * - On the server (SSR), the call goes straight to `src/server/functions.ts`.
 * - In the browser, it becomes `POST /_rpc/:name` with the arguments as JSON.
 *
 * Vite replaces `import.meta.env.SSR` with a constant at build time, so the
 * server branch, and the server modules it imports, are not in the client bundle.
 * Only the `ServerFunctions` type crosses over, which keeps both sides in sync.
 */
import { ServerFnError } from "./shared/errors.ts";
import type { ServerFunctions } from "./server/functions.ts";

type Name = keyof ServerFunctions;
type Args<N extends Name> = Parameters<ServerFunctions[N]>;
type Result<N extends Name> = Awaited<ReturnType<ServerFunctions[N]>>;

export async function call<N extends Name>(
  name: N,
  ...args: Args<N>
): Promise<Result<N>> {
  if (import.meta.env.SSR) {
    const { serverFunctions } = await import("./server/functions.ts");
    const fn = serverFunctions[name] as (...a: Args<N>) => Promise<Result<N>>;
    return fn(...args);
  }

  const response = await fetch(`/_rpc/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const body = (await response.json().catch(() => ({}))) as {
    data?: Result<N>;
    error?: string;
  };
  if (!response.ok)
    throw new ServerFnError(body.error ?? "Something went wrong");
  return body.data as Result<N>;
}

/** `api.addTask(title, priority)` reads better than `call("addTask", title, priority)`. */
export const api = new Proxy({} as ServerFunctions, {
  get:
    (_, name: string) =>
    (...args: unknown[]) =>
      (call as (name: string, ...a: unknown[]) => Promise<unknown>)(
        name,
        ...args,
      ),
});
