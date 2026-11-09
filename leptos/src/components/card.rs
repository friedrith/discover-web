use leptos::prelude::*;

#[component]
pub fn Card(#[prop(into)] title: String, children: Children) -> impl IntoView {
    view! {
        <section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 class="mb-4 text-lg font-semibold text-zinc-900">{title}</h2>
            {children()}
        </section>
    }
}
