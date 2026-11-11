import { Card } from "../components/Card.tsx";

const ROWS: [part: string, place: "Server" | "Browser", how: string][] = [
  [
    "HTML of every page",
    "Server",
    "Express calls entry-server.tsx, React streams the HTML",
  ],
  [
    "Loaders and actions (first request)",
    "Server",
    "React Router's static handler",
  ],
  [
    "Server functions",
    "Server",
    "src/server/functions.ts, reached through src/api.ts",
  ],
  [
    "Task and post data",
    "Server",
    "src/server/store.ts, never in the client bundle",
  ],
  ["State, effects, optimistic UI", "Browser", "React after hydration"],
  [
    "Routing between pages",
    "Browser",
    "createBrowserRouter, no full page reload",
  ],
  [
    "Forms before the JS loads",
    "Server",
    "the action runs on the server, then a 303 redirect",
  ],
  ["Dark mode", "Browser", "an inline <head> script, then a class on <html>"],
];

export function AboutPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          How it works
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          One TypeScript codebase, built twice by Vite: a server bundle that
          renders HTML and a client bundle that hydrates it.
        </p>
      </header>

      <Card title="What runs where">
        <div className="-mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-4 font-medium">Part</th>
                <th className="py-2 pr-4 font-medium">Runs on</th>
                <th className="py-2 font-medium">How</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {ROWS.map(([part, place, how]) => (
                <tr key={part}>
                  <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                    {part}
                  </td>
                  <td
                    className={`py-2 pr-4 ${
                      place === "Server"
                        ? "text-sky-700 dark:text-sky-400"
                        : "text-orange-700 dark:text-orange-400"
                    }`}
                  >
                    {place}
                  </td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">
                    {how}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Request lifecycle">
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            The browser asks for /tasks. Express hands the request to the static
            handler, which matches the route and runs its loader.
          </li>
          <li>
            React renders the page with the loader data and streams the HTML.
            The data goes along in a script tag.
          </li>
          <li>
            The browser loads the client bundle and hydrates: React attaches to
            the existing HTML instead of rebuilding it, and the router reuses
            the data instead of fetching it again.
          </li>
          <li>
            From now on, links are client-side navigations, and loaders and
            actions call server functions with fetch.
          </li>
        </ol>
      </Card>

      <Card title="Source layout">
        <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-100">
          {`server.ts            Express: Vite middleware, /_rpc, SSR
index.html           HTML template, theme script
src/
  entry-server.tsx   render(request), handleRpc()
  entry-client.tsx   hydrateRoot + createBrowserRouter
  routes.tsx         route tree: loaders, actions, errors
  api.ts             server function calls (direct or fetch)
  shared/            types shared by server and client
  server/            functions, store, posts (server only)
  pages/             one module per route
  components/        Button, Card, Badge, Skeleton, ThemeToggle…`}
        </pre>
      </Card>
    </>
  );
}
