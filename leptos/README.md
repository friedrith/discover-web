# Discover Leptos

A Rust fullstack web app: one crate built twice.

- **Server:** a native [Axum](https://github.com/tokio-rs/axum) binary renders
  the HTML (SSR) and answers server functions.
- **Client:** the same code compiled to **WebAssembly** takes over the page in
  the browser (hydration) and makes it interactive.
- **Styling:** Tailwind v4, run by `cargo-leptos`. It scans `.rs` files for
  class names, so no Node is needed.
- **Components:** shadcn-style `Button` and `Card` in
  [`src/components`](src/components). They are plain Tailwind classes in your
  own code. For a full set, see [Rust/UI](https://www.rust-ui.com).

It is the Rust counterpart of a Next.js + React + Tailwind + shadcn app.

## What the demo shows

| Page | Shows | Code |
|---|---|---|
| `/` Home | Signals and memos in WASM, a server function form, a resource streamed with the HTML and refetched on demand | [`pages/home.rs`](src/pages/home.rs) |
| `/tasks` Task board | Create, toggle, delete and clear tasks with server functions. Optimistic rows while a request is in flight. Filter stored in the URL (`?filter=active`). Works without JavaScript (`ActionForm` falls back to a form post) | [`pages/tasks.rs`](src/pages/tasks.rs) |
| `/blog` Blog | Nested routes (`<ParentRoute/>` + `<Outlet/>`), a `:slug` parameter, live search and tag filters in the query string, `<Transition/>` vs `<Suspense/>`, per-page `<Title/>` and `<Meta/>` | [`pages/blog.rs`](src/pages/blog.rs) |
| `/about` | What runs on the server and what runs in the browser | [`pages/about.rs`](src/pages/about.rs) |
| Any other URL | A 404 page that also sends a real `404` status during SSR | [`pages/not_found.rs`](src/pages/not_found.rs) |

Across the site:

- **Shared types.** [`models.rs`](src/models.rs) is compiled into both the
  server and the WASM bundle, so both sides agree on every payload.
- **Server-only code.** [`store.rs`](src/store.rs) is behind
  `#[cfg(feature = "ssr")]` and never reaches the browser. It holds the tasks
  in memory (they reset on restart) and validates input: empty or long titles,
  duplicates, and a cap of 50 tasks.
- **Server functions.** [`api.rs`](src/api.rs) has every `#[server]` function.
  Most of them wait 250 ms on purpose so you can see loading states.
- **Dark mode.** An inline script in `<head>` applies the saved or system theme
  before the first paint, then a context signal drives the toggle.

## Run it

```bash
rustup target add wasm32-unknown-unknown
cargo install cargo-leptos --locked
cargo leptos watch          # http://127.0.0.1:3100, live reload
```

Production build:

```bash
cargo leptos build --release
```

This produces `target/release/leptos-fullstack` (the server) and `target/site/`
(the WASM, JS and CSS). 

## Deploy

The [`Dockerfile`](Dockerfile) is a multi-stage build: compile with Rust, then
copy only the binary and `site/` into `debian:bookworm-slim`. The included
[`fly.toml`](fly.toml) targets [Fly.io](https://fly.io) (Montréal region,
256 MB, scales to zero):

```bash
fly launch --no-deploy   # choose a unique app name
fly deploy
```

The same image runs on any container host (Railway, Google Cloud Run, or a VPS
with Coolify). Put Cloudflare in front to cache `/pkg/*` at the edge.

## Layout

```
src/
  main.rs          Axum server (feature "ssr")
  lib.rs           WASM entry point: hydrate() (feature "hydrate")
  app.rs           HTML shell, layout, navigation, routes
  models.rs        types shared by server and client
  api.rs           #[server] functions
  store.rs         in-memory data, server only
  pages/           one module per route
  components/      Button, Card, Badge, Skeleton, Spinner, ThemeToggle
style/tailwind.css Tailwind input (scans src/**/*.rs)
Cargo.toml         [package.metadata.leptos] config for cargo-leptos
```

## Tests

```bash
cargo test --features ssr
```

The tests cover the store (validation, sorting, search) and the shared helpers.
