use leptos::prelude::*;
use leptos_meta::Title;
use leptos_router::components::A;

use crate::api::{Greet, error_message, fetch_server_info};
use crate::components::{Button, ButtonSize, ButtonVariant, Card, Skeleton, Spinner};

#[component]
pub fn HomePage() -> impl IntoView {
    view! {
        <Title text="Home" />
        <section class="flex flex-col gap-4 py-6">
            <p class="text-sm font-medium text-orange-600 dark:text-orange-400">
                "Rust · Axum · WebAssembly · Tailwind"
            </p>
            <h1 class="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
                "One language, from the database to the button."
            </h1>
            <p class="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
                "An Axum server renders every page as HTML, then a WebAssembly bundle built from the same crate takes over in the browser."
            </p>
        </section>

        <section class="grid gap-4 sm:grid-cols-3">
            <Feature
                href="/tasks"
                title="Task board"
                text="CRUD with server functions, optimistic UI and filters in the URL."
            />
            <Feature
                href="/blog"
                title="Blog"
                text="Nested routes, dynamic :slug params, search and streaming Suspense."
            />
            <Feature
                href="/about"
                title="How it works"
                text="What runs on the server, what runs in WASM, and why."
            />
        </section>

        <div class="grid gap-6 md:grid-cols-2">
            <Counter />
            <GreetForm />
        </div>
        <ServerInfoCard />
    }
}

#[component]
fn Feature(href: &'static str, title: &'static str, text: &'static str) -> impl IntoView {
    view! {
        <A
            href=href
            attr:class="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
            <h2 class="font-semibold text-zinc-900 dark:text-zinc-50">
                {title} " " <span class="inline-block transition group-hover:translate-x-1">"→"</span>
            </h2>
            <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
        </A>
    }
}

/// Runs entirely in the browser (WASM) after hydration.
#[component]
fn Counter() -> impl IntoView {
    let count = RwSignal::new(0i32);
    let history = RwSignal::new(Vec::<i32>::new());
    // A memo recomputes only when `count` changes.
    let parity = Memo::new(move |_| if count.get() % 2 == 0 { "even" } else { "odd" });

    let apply = move |delta: i32| {
        count.update(|c| *c += delta);
        history.update(|h| {
            h.push(count.get_untracked());
            if h.len() > 12 {
                h.remove(0);
            }
        });
    };

    view! {
        <Card title="Client state (WASM)" description="Signals and memos. No server round trip.">
            <p class="text-5xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {move || count.get()}
            </p>
            <p class="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                "The number is " {move || parity.get()}
            </p>
            <div class="flex flex-wrap gap-2">
                <Button on_click=Callback::new(move |_| apply(1))>"+1"</Button>
                <Button variant=ButtonVariant::Outline on_click=Callback::new(move |_| apply(-1))>
                    "−1"
                </Button>
                <Button variant=ButtonVariant::Outline on_click=Callback::new(move |_| apply(10))>
                    "+10"
                </Button>
                <Button
                    variant=ButtonVariant::Ghost
                    on_click=Callback::new(move |_| {
                        count.set(0);
                        history.set(Vec::new());
                    })
                >
                    "Reset"
                </Button>
            </div>
            <div class="mt-4 flex h-12 items-end gap-1" aria-label="Recent values">
                {move || {
                    let values = history.get();
                    let max = values.iter().map(|v| v.unsigned_abs()).max().unwrap_or(1).max(1);
                    values
                        .into_iter()
                        .map(|v| {
                            let height = 8 + (v.unsigned_abs() * 40 / max);
                            let color = if v < 0 { "bg-red-400" } else { "bg-zinc-800 dark:bg-zinc-200" };
                            view! {
                                <div
                                    class=format!("w-3 rounded-sm transition-all {color}")
                                    style=format!("height: {height}px")
                                    title=v.to_string()
                                ></div>
                            }
                        })
                        .collect_view()
                }}
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
        <Card
            title="Server function (Axum)"
            description="Works as a plain HTML form before the WASM loads."
        >
            <ActionForm action=greet_action attr:class="flex gap-2">
                <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    autocomplete="off"
                    class="input flex-1"
                />
                <Button button_type="submit" disabled=pending>
                    {move || if pending.get() { "Sending…" } else { "Greet" }}
                </Button>
            </ActionForm>
            <p class="mt-4 text-sm" aria-live="polite">
                {move || match result.get() {
                    None => {
                        view! { <span class="text-zinc-500 dark:text-zinc-400">"No request yet."</span> }
                            .into_any()
                    }
                    Some(Ok(greeting)) => {
                        view! {
                            <span class="text-emerald-700 dark:text-emerald-400">
                                {greeting.message} " (" {greeting.name_length} " characters)"
                            </span>
                        }
                            .into_any()
                    }
                    Some(Err(err)) => {
                        view! { <span class="text-red-600 dark:text-red-400">{error_message(&err)}</span> }
                            .into_any()
                    }
                }}
            </p>
        </Card>
    }
}

/// A resource loaded during SSR, then refetched on demand from the browser.
#[component]
fn ServerInfoCard() -> impl IntoView {
    let refresh = RwSignal::new(0u32);
    let info = Resource::new(move || refresh.get(), |_| fetch_server_info());
    // Which refresh the stats on screen belong to. Different from `refresh` while loading.
    let shown = RwSignal::new(0u32);

    view! {
        <Card
            title="Live server stats"
            description="Fetched by a server function. The first load is streamed with the HTML."
        >
            <Transition fallback=|| view! { <Skeleton lines=2 /> }>
                {move || Suspend::new(async move {
                    let result = info.await;
                    shown.set(refresh.get_untracked());
                    match result {
                        Ok(info) => {
                            view! {
                                <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <Stat label="Uptime" value=format_uptime(info.uptime_secs) />
                                    <Stat label="Server calls" value=info.server_calls.to_string() />
                                    <Stat label="Tasks stored" value=info.task_count.to_string() />
                                    <Stat label="Platform" value=format!("{} / {}", info.os, info.arch) />
                                </dl>
                            }
                                .into_any()
                        }
                        Err(err) => {
                            view! { <p class="text-sm text-red-600">{error_message(&err)}</p> }.into_any()
                        }
                    }
                })}
            </Transition>
            <div class="mt-4 flex items-center gap-3">
                <Button
                    variant=ButtonVariant::Outline
                    size=ButtonSize::Small
                    on_click=Callback::new(move |_| refresh.update(|n| *n += 1))
                >
                    "Refresh"
                </Button>
                <Show when=move || shown.get() != refresh.get()>
                    <Spinner />
                </Show>
            </div>
        </Card>
    }
}

#[component]
fn Stat(label: &'static str, value: String) -> impl IntoView {
    view! {
        <div>
            <dt class="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd class="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {value}
            </dd>
        </div>
    }
}

fn format_uptime(secs: u64) -> String {
    match secs {
        0..60 => format!("{secs}s"),
        60..3_600 => format!("{}m {}s", secs / 60, secs % 60),
        _ => format!("{}h {}m", secs / 3_600, (secs % 3_600) / 60),
    }
}
