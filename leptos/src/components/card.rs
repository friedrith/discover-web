use leptos::prelude::*;

#[component]
pub fn Card(
    #[prop(into)] title: String,
    #[prop(optional, into)] description: Option<String>,
    children: Children,
) -> impl IntoView {
    view! {
        <section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <header class="mb-4">
                <h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
                {description
                    .map(|d| {
                        view! { <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{d}</p> }
                    })}
            </header>
            {children()}
        </section>
    }
}
