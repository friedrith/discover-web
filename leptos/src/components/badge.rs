use leptos::prelude::*;

#[derive(Clone, Copy, Default, PartialEq)]
pub enum BadgeTone {
    #[default]
    Neutral,
    Red,
    Amber,
    Green,
    Blue,
}

#[component]
pub fn Badge(#[prop(optional)] tone: BadgeTone, children: Children) -> impl IntoView {
    let tone_class = match tone {
        BadgeTone::Neutral => "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        BadgeTone::Red => "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
        BadgeTone::Amber => "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        BadgeTone::Green => {
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        }
        BadgeTone::Blue => "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    };
    view! {
        <span class=format!(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {tone_class}"
        )>{children()}</span>
    }
}
