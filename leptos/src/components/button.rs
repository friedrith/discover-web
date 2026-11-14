use leptos::prelude::*;

/// shadcn-style button: plain Tailwind classes, the component lives in your code.
#[derive(Clone, Copy, Default, PartialEq)]
pub enum ButtonVariant {
    #[default]
    Primary,
    Outline,
    Ghost,
    Danger,
}

#[derive(Clone, Copy, Default, PartialEq)]
pub enum ButtonSize {
    #[default]
    Default,
    Small,
    Icon,
}

#[component]
pub fn Button(
    #[prop(optional)] variant: ButtonVariant,
    #[prop(optional)] size: ButtonSize,
    #[prop(into, optional)] disabled: Signal<bool>,
    #[prop(optional, into)] button_type: Option<&'static str>,
    #[prop(optional, into)] aria_label: Option<String>,
    #[prop(optional)] on_click: Option<Callback<()>>,
    children: Children,
) -> impl IntoView {
    let variant_class = match variant {
        ButtonVariant::Primary => {
            "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        }
        ButtonVariant::Outline => {
            "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 \
             dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        }
        ButtonVariant::Ghost => {
            "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        }
        ButtonVariant::Danger => {
            "text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        }
    };
    let size_class = match size {
        ButtonSize::Default => "h-10 px-4",
        ButtonSize::Small => "h-8 px-3 text-xs",
        ButtonSize::Icon => "size-8",
    };
    view! {
        <button
            type=button_type.unwrap_or("button")
            aria-label=aria_label
            class=format!(
                "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium \
                 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 \
                 disabled:pointer-events-none disabled:opacity-50 {variant_class} {size_class}"
            )
            disabled=disabled
            on:click=move |_| {
                if let Some(on_click) = on_click {
                    on_click.run(());
                }
            }
        >
            {children()}
        </button>
    }
}
