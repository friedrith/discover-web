use leptos::prelude::*;
use leptos_meta::Title;

use crate::components::Card;

#[component]
pub fn AboutPage() -> impl IntoView {
    let rows = [
        (
            "HTML of every page",
            "Server",
            "Axum renders the routes with streaming SSR",
        ),
        (
            "Server functions",
            "Server",
            "#[server] bodies in src/api.rs",
        ),
        (
            "Task and post data",
            "Server",
            "src/store.rs, behind the \"ssr\" feature",
        ),
        ("Signals, memos, effects", "Browser", "WASM after hydration"),
        (
            "Routing between pages",
            "Browser",
            "leptos_router, no full page reload",
        ),
        (
            "Forms before WASM loads",
            "Server",
            "ActionForm falls back to an HTML form post",
        ),
        (
            "Dark mode",
            "Browser",
            "an inline <head> script, then a context signal",
        ),
    ];

    view! {
        <Title text="How it works" />
        <header class="flex flex-col gap-2">
            <h1 class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                "How it works"
            </h1>
            <p class="text-zinc-600 dark:text-zinc-400">
                "One crate, compiled twice by cargo-leptos: a native server binary and a WebAssembly library."
            </p>
        </header>

        <Card title="What runs where">
            <div class="-mx-6 overflow-x-auto px-6">
                <table class="w-full min-w-[32rem] text-left text-sm">
                    <thead class="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        <tr>
                            <th class="py-2 pr-4 font-medium">"Part"</th>
                            <th class="py-2 pr-4 font-medium">"Runs on"</th>
                            <th class="py-2 font-medium">"How"</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {rows
                            .into_iter()
                            .map(|(part, place, how)| {
                                let tone = if place == "Server" {
                                    "text-sky-700 dark:text-sky-400"
                                } else {
                                    "text-orange-700 dark:text-orange-400"
                                };
                                view! {
                                    <tr>
                                        <td class="py-2 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                                            {part}
                                        </td>
                                        <td class=format!("py-2 pr-4 {tone}")>{place}</td>
                                        <td class="py-2 text-zinc-600 dark:text-zinc-400">{how}</td>
                                    </tr>
                                }
                            })
                            .collect_view()}
                    </tbody>
                </table>
            </div>
        </Card>

        <Card title="Request lifecycle">
            <ol class="flex list-decimal flex-col gap-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                <li>"The browser asks for /tasks. Axum matches the route and runs the components."</li>
                <li>"The page shell is sent at once. Each resource streams in as soon as its server function returns."</li>
                <li>"The browser loads the WASM bundle and hydrates: it attaches to the existing HTML instead of rebuilding it."</li>
                <li>"From now on, links are client-side navigations and forms call server functions with fetch."</li>
            </ol>
        </Card>

        <Card title="Source layout">
            <pre class="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-100">
                {"src/
  main.rs          Axum server (feature \"ssr\")
  lib.rs           WASM entry point: hydrate()
  app.rs           shell, layout, routes
  models.rs        types shared by server and client
  api.rs           #[server] functions
  store.rs         in-memory data (server only)
  pages/           one module per route
  components/      Button, Card, Badge, Skeleton, ThemeToggle…"}
            </pre>
        </Card>
    }
}
