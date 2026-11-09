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

| Card | Runs where | Code |
|---|---|---|
| Client state | Browser (WASM) after hydration | `Counter` in [`src/app.rs`](src/app.rs) |
| Server function | Axum server, called from the browser | `#[server] greet` in [`src/app.rs`](src/app.rs) |

The `Greeting` struct is defined once and shared by the server and the client.
Leptos creates the HTTP endpoint and the serialization for the server function.
The form is an `ActionForm`, so it also works before the WASM has loaded.

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
(the WASM, JS and CSS). The WASM bundle is about 490 KB, or about 200 KB
gzipped. The server uses about 7 MB of RAM at idle.

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
  app.rs           pages, server function, shared types
  components/      shadcn-style UI components
style/tailwind.css Tailwind input (scans src/**/*.rs)
Cargo.toml         [package.metadata.leptos] config for cargo-leptos
```
