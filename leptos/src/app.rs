use leptos::prelude::*;
use leptos_meta::{Link, Meta, MetaTags, Stylesheet, Title, provide_meta_context};
use leptos_router::{
    components::{A, ParentRoute, Route, Router, Routes},
    path,
};

use crate::components::{THEME_SCRIPT, Theme, ThemeToggle};
use crate::pages::{AboutPage, BlogLayout, HomePage, NotFound, PostList, PostPage, TasksPage};

/// HTML shell rendered by the server for every page.
pub fn shell(options: LeptosOptions) -> impl IntoView {
    view! {
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                // Before any CSS: picks light or dark so the first paint is right.
                <script inner_html=THEME_SCRIPT></script>
                <AutoReload options=options.clone() />
                <HydrationScripts options />
                <MetaTags />
            </head>
            <body class="bg-zinc-50 text-zinc-800 antialiased dark:bg-zinc-950 dark:text-zinc-200">
                <App />
            </body>
        </html>
    }
}

#[component]
pub fn App() -> impl IntoView {
    provide_meta_context();
    Theme::provide();

    view! {
        <Stylesheet id="leptos" href="/pkg/leptos-fullstack.css" />
        <Title formatter=|page: String| format!("{page} · Discover Leptos") />
        <Meta
            name="description"
            content="A Rust fullstack demo: Axum server, WebAssembly client, Tailwind."
        />
        <Link
            rel="icon"
            href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>🦀</text></svg>"
        />
        <Router>
            <div class="flex min-h-screen flex-col">
                <SiteHeader />
                <main class="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
                    <Routes fallback=|| view! { <NotFound /> }>
                        <Route path=path!("/") view=HomePage />
                        <Route path=path!("/tasks") view=TasksPage />
                        <ParentRoute path=path!("/blog") view=BlogLayout>
                            <Route path=path!("") view=PostList />
                            <Route path=path!(":slug") view=PostPage />
                        </ParentRoute>
                        <Route path=path!("/about") view=AboutPage />
                    </Routes>
                </main>
                <SiteFooter />
            </div>
        </Router>
    }
}

#[component]
fn SiteHeader() -> impl IntoView {
    // `<A/>` sets aria-current="page" on the active link; Tailwind styles it.
    let link = "rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors \
                hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 \
                aria-[current=page]:bg-zinc-900 aria-[current=page]:text-white \
                dark:aria-[current=page]:bg-zinc-100 dark:aria-[current=page]:text-zinc-900";
    view! {
        <header class="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
            <div class="mx-auto flex h-14 max-w-4xl items-center gap-4 px-4">
                <A href="/" attr:class="flex shrink-0 items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
                    <span aria-hidden="true">"🦀"</span>
                    <span class="hidden sm:inline">"Discover Leptos"</span>
                </A>
                <nav class="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1" aria-label="Main">
                    <A href="/" exact=true attr:class=link>
                        "Home"
                    </A>
                    <A href="/tasks" attr:class=link>
                        "Tasks"
                    </A>
                    <A href="/blog" attr:class=link>
                        "Blog"
                    </A>
                    <A href="/about" attr:class=link>
                        "About"
                    </A>
                </nav>
                <ThemeToggle />
            </div>
        </header>
    }
}

#[component]
fn SiteFooter() -> impl IntoView {
    view! {
        <footer class="border-t border-zinc-200 dark:border-zinc-800">
            <div class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                <p>"Built with Leptos 0.8, Axum and Tailwind v4."</p>
                <a
                    class="hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
                    href="https://book.leptos.dev"
                    target="_blank"
                    rel="noreferrer"
                >
                    "The Leptos book ↗"
                </a>
            </div>
        </footer>
    }
}
