use leptos::prelude::*;
use leptos_meta::{MetaTags, Stylesheet, Title, provide_meta_context};
use leptos_router::{
    StaticSegment,
    components::{Route, Router, Routes},
};
use serde::{Deserialize, Serialize};

use crate::components::{Button, ButtonVariant, Card};

/// HTML shell rendered by the server for every page.
pub fn shell(options: LeptosOptions) -> impl IntoView {
    view! {
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <AutoReload options=options.clone() />
                <HydrationScripts options />
                <MetaTags />
            </head>
            <body class="bg-zinc-50 text-zinc-800 antialiased">
                <App />
            </body>
        </html>
    }
}

#[component]
pub fn App() -> impl IntoView {
    provide_meta_context();

    view! {
        <Stylesheet id="leptos" href="/pkg/leptos-fullstack.css" />
        <Title text="Discover Leptos" />
        <Router>
            <main class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
                <Routes fallback=|| "Page not found.".into_view()>
                    <Route path=StaticSegment("") view=HomePage />
                </Routes>
            </main>
        </Router>
    }
}

/// Type shared by the server and the WASM client: one definition, checked at compile time.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Greeting {
    pub message: String,
    pub name_length: usize,
}

/// Server function: the body runs only on the Axum server. In the browser, calling it
/// sends an HTTP request to an endpoint Leptos generates.
#[server]
pub async fn greet(name: String) -> Result<Greeting, ServerFnError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(ServerFnError::new("Please type a name"));
    }
    Ok(Greeting {
        message: format!("Hello {name}, this was computed by the Rust server"),
        name_length: name.chars().count(),
    })
}

#[component]
fn HomePage() -> impl IntoView {
    view! {
        <header class="flex flex-col gap-2">
            <h1 class="text-3xl font-bold tracking-tight text-zinc-900">"Discover Leptos"</h1>
            <p class="text-zinc-600">
                "Rust on both sides: an Axum server renders this page, then a WebAssembly bundle makes it interactive."
            </p>
        </header>
        <Counter />
        <GreetForm />
    }
}

/// Runs entirely in the browser (WASM) after hydration.
#[component]
fn Counter() -> impl IntoView {
    let count = RwSignal::new(0);

    view! {
        <Card title="Client state (WASM)">
            <p class="mb-4 text-4xl font-bold tabular-nums">{move || count.get()}</p>
            <div class="flex gap-2">
                <Button on_click=Callback::new(move |_| *count.write() += 1)>"+1"</Button>
                <Button
                    variant=ButtonVariant::Outline
                    on_click=Callback::new(move |_| count.set(0))
                >
                    "Reset"
                </Button>
            </div>
        </Card>
    }
}

/// Calls the `greet` server function from the browser.
#[component]
fn GreetForm() -> impl IntoView {
    let greet_action = ServerAction::<Greet>::new();
    let pending = greet_action.pending();
    let result = greet_action.value();

    view! {
        <Card title="Server function (Axum)">
            <ActionForm action=greet_action attr:class="flex gap-2">
                <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    class="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <Button button_type="submit" disabled=pending>
                    {move || if pending.get() { "Sending…" } else { "Greet" }}
                </Button>
            </ActionForm>
            <p class="mt-4 text-sm">
                {move || match result.get() {
                    None => view! { <span class="text-zinc-500">"No request yet."</span> }.into_any(),
                    Some(Ok(greeting)) => view! {
                        <span class="text-emerald-700">
                            {greeting.message} " (" {greeting.name_length} " characters)"
                        </span>
                    }.into_any(),
                    Some(Err(err)) => view! {
                        <span class="text-red-600">{err.to_string()}</span>
                    }.into_any(),
                }}
            </p>
        </Card>
    }
}
