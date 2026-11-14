use leptos::prelude::*;

use super::{Button, ButtonSize, ButtonVariant};

/// Runs in `<head>` before the first paint, so a dark-mode user never sees a light flash.
/// Tailwind's `dark:` variant matches the `dark` class on `<html>`.
pub const THEME_SCRIPT: &str = r#"(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();"#;

/// Dark mode, shared through context.
#[derive(Clone, Copy)]
pub struct Theme {
    pub dark: RwSignal<bool>,
}

impl Theme {
    pub fn provide() -> Self {
        let theme = Self {
            dark: RwSignal::new(false),
        };
        // Effects run only in the browser, after hydration: read what the head script decided.
        Effect::new(move |_| {
            #[cfg(feature = "hydrate")]
            if let Some(root) = document().document_element() {
                theme.dark.set(root.class_list().contains("dark"));
            }
        });
        provide_context(theme);
        theme
    }

    pub fn toggle(self) {
        let dark = !self.dark.get_untracked();
        self.dark.set(dark);
        #[cfg(feature = "hydrate")]
        {
            if let Some(root) = document().document_element() {
                let _ = root.class_list().toggle_with_force("dark", dark);
            }
            if let Ok(Some(storage)) = window().local_storage() {
                let _ = storage.set_item("theme", if dark { "dark" } else { "light" });
            }
        }
    }
}

#[component]
pub fn ThemeToggle() -> impl IntoView {
    let theme = expect_context::<Theme>();
    view! {
        <Button
            variant=ButtonVariant::Ghost
            size=ButtonSize::Icon
            aria_label="Toggle dark mode"
            on_click=Callback::new(move |_| theme.toggle())
        >
            <span aria-hidden="true">{move || if theme.dark.get() { "☀" } else { "☾" }}</span>
        </Button>
    }
}
