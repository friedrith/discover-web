import { Button } from "./Button.tsx";

/**
 * The script in index.html sets the `dark` class before the first paint.
 * Both icons are rendered and the `dark:` classes pick one, so the server
 * never needs to know the theme and hydration always matches.
 */
export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // Storage can be disabled; the toggle still works for this page.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={toggle}
    >
      <span aria-hidden="true" className="dark:hidden">
        ☾
      </span>
      <span aria-hidden="true" className="hidden dark:inline">
        ☀
      </span>
    </Button>
  );
}
