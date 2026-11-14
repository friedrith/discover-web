use leptos::prelude::*;
use leptos_meta::Title;
use leptos_router::components::A;

#[component]
pub fn NotFound() -> impl IntoView {
    // During SSR, answer with a real 404 status, not a 200 with an error page.
    #[cfg(feature = "ssr")]
    if let Some(response) = use_context::<leptos_axum::ResponseOptions>() {
        response.set_status(axum::http::StatusCode::NOT_FOUND);
    }

    view! {
        <Title text="Page not found" />
        <div class="flex flex-col items-center gap-4 py-20 text-center">
            <p class="text-6xl font-bold text-zinc-300 dark:text-zinc-700">"404"</p>
            <h1 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">"Page not found"</h1>
            <p class="text-zinc-600 dark:text-zinc-400">"This address does not match any route."</p>
            <A
                href="/"
                attr:class="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
            >
                "Go home"
            </A>
        </div>
    }
}
