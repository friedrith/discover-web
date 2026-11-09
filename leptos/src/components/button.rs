use leptos::prelude::*;

/// shadcn-style button: plain Tailwind classes, the component lives in your code.
#[derive(Clone, Copy, Default, PartialEq)]
pub enum ButtonVariant {
    #[default]
    Primary,
    Outline,
}

#[component]
pub fn Button(
    #[prop(optional)] variant: ButtonVariant,
    #[prop(into, optional)] disabled: Signal<bool>,
    #[prop(optional, into)] button_type: Option<&'static str>,
    #[prop(optional)] on_click: Option<Callback<()>>,
    children: Children,
) -> impl IntoView {
    let variant_class = match variant {
        ButtonVariant::Primary => "bg-zinc-900 text-white hover:bg-zinc-700",
        ButtonVariant::Outline => "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100",
    };
    view! {
        <button
            type=button_type.unwrap_or("button")
            class=format!(
                "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium \
                 transition-colors disabled:pointer-events-none disabled:opacity-50 {variant_class}"
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
