# Vite SSR fullstack example

The same site as [`../leptos`](../leptos), built with TypeScript instead of Rust:
Express renders every page with Vite SSR, then React hydrates it in the browser.
There is no meta-framework: the server, the render step and the RPC layer are
plain files you can read in one sitting.

- **Vite 8** builds the client and the server bundles, and serves the dev server in middleware mode.
- **React 19** renders on both sides (`renderToPipeableStream`, then `hydrateRoot`).
- **React Router 7** in data mode: loaders, actions and fetchers, run by
  `createStaticHandler` on the server and `createBrowserRouter` in the browser.
- **Express 5** serves the assets, the RPC endpoint and the pages.
- **Tailwind v4** through `@tailwindcss/vite`, with the same classes as the Leptos version.

## Run it

```bash
bun install
bun run dev        # http://127.0.0.1:3200, edits apply on the next request
```

Production build:

```bash
bun run build      # dist/client (assets) + dist/server (render + RPC)
bun run start      # NODE_ENV=production
```

`PORT` and `HOST` change the address. `server.ts` runs with Node's built-in
TypeScript support, so it needs Node 22.18 or newer.

## What the demo shows

| Page                   | What it shows                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                    | A counter with client state and a history chart; a form that calls a server function; server stats loaded with the page and refreshed with `useRevalidator`.                                                              |
| `/tasks`               | A task board: add, complete, delete, clear. Rows update before the server answers (`fetcher.formData`). The filter lives in the URL (`?filter=active`). With JavaScript off, the forms still work through a 303 redirect. |
| `/blog`, `/blog/:slug` | Nested routes with a shared layout, live search through a GET form, tag filters, previous/next links, and an error element that answers with a real 404.                                                                  |
| `/about`               | What runs on the server and what runs in the browser.                                                                                                                                                                     |
| any other URL          | A 404 page with a 404 status.                                                                                                                                                                                             |

Across the site: dark mode without a flash (an inline script in `index.html`
sets the class before the first paint), a title and description per page, a
progress bar while the next page loads, and a 250 ms simulated delay on most
server functions so the loading states are visible (`SIMULATED_DELAY_MS` in
`src/server/store.ts`; `listTasks` has none).

## How a request flows

1. `server.ts` gets `GET /tasks` and hands a Fetch `Request` to `render()` in `src/entry-server.tsx`.
2. React Router's static handler matches the route and runs its loader. The
   loader calls `api.listTasks()`, which on the server calls
   `src/server/functions.ts` directly.
3. React streams the HTML into `index.html`. The loader data goes along in a
   script tag (`window.__staticRouterHydrationData`).
4. `src/entry-client.tsx` hydrates. From then on, the same loaders and actions
   run in the browser, and `api.*` calls become `POST /_rpc/:name`.

`import.meta.env.SSR` is a build-time constant, so the server branch of
`src/api.ts`, and the store behind it, are not in the client bundle.

## Layout

```
server.ts            Express: Vite middleware or static assets, /_rpc, SSR
index.html           HTML template, theme script
src/
  entry-server.tsx   render(request), renderToStream(), handleRpc()
  entry-client.tsx   hydrateRoot + createBrowserRouter
  routes.tsx         route tree: loaders, actions, error elements, titles
  api.ts             server function calls: direct on the server, fetch in the browser
  meta.ts            page titles and descriptions
  shared/            models and errors used on both sides
  server/            functions, task store, blog posts (server only)
  pages/             one module per route
  components/        Button, Card, Badge, Spinner, Skeleton, ThemeToggle, Layout
```

## Compared with the Leptos version

| Leptos                             | Here                                               |
| ---------------------------------- | -------------------------------------------------- |
| `#[server]` function               | function in `src/server/functions.ts` + `api.*`    |
| `#[cfg(feature = "ssr")]`          | `import.meta.env.SSR` and the `src/server/` folder |
| `Resource` + `<Transition/>`       | route `loader` + `useNavigation()`                 |
| `ServerAction` + `<ActionForm/>`   | route `action` + `<fetcher.Form>`                  |
| `action.input()` (optimistic UI)   | `fetcher.formData`                                 |
| `ResponseOptions::set_status(404)` | `throw data(message, { status: 404 })`             |
| `leptos_meta` `<Title/>`           | route `handle.title`                               |

One difference: Leptos streams each resource as it resolves. Here the loaders
finish before rendering starts, so the HTML is sent once the page's data is ready.

## Tests and checks

```bash
bun run test        # Vitest: models, store, and real requests through render()
bun run typecheck
bun run format
```
