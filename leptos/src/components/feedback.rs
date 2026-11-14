use leptos::prelude::*;

/// Small animated spinner for inline loading states.
#[component]
pub fn Spinner() -> impl IntoView {
    view! {
        <span
            role="status"
            aria-label="Loading"
            class="inline-block size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
        ></span>
    }
}

/// Grey placeholder lines shown while a resource loads for the first time.
#[component]
pub fn Skeleton(#[prop(default = 3)] lines: usize) -> impl IntoView {
    view! {
        <div class="flex animate-pulse flex-col gap-3" aria-hidden="true">
            {(0..lines)
                .map(|i| {
                    let width = ["w-full", "w-5/6", "w-2/3", "w-3/4"][i % 4];
                    view! { <div class=format!("h-4 rounded bg-zinc-200 dark:bg-zinc-800 {width}")></div> }
                })
                .collect_view()}
        </div>
    }
}

/// Fallback for an `<ErrorBoundary/>`.
#[component]
pub fn ErrorNotice(#[prop(into)] message: String, children: Children) -> impl IntoView {
    view! {
        <div
            role="alert"
            class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
            <p class="font-medium">{message}</p>
            <div class="mt-2">{children()}</div>
        </div>
    }
}
