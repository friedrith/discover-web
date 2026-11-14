import type { ReactNode } from "react";
import { Link, NavLink, useNavigation } from "react-router";
import { ProgressBar } from "./Feedback.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

// `<NavLink>` sets aria-current="page" on the active link; Tailwind styles it.
const NAV_LINK =
  "rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 aria-[current=page]:bg-zinc-900 aria-[current=page]:text-white dark:aria-[current=page]:bg-zinc-100 dark:aria-[current=page]:text-zinc-900";

export function Layout({ children }: { children: ReactNode }) {
  const navigation = useNavigation();
  return (
    <div className="flex min-h-screen flex-col">
      <ProgressBar active={navigation.state === "loading"} />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-4 px-4">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50"
        >
          <span aria-hidden="true">⚡</span>
          <span className="hidden sm:inline">Discover Vite SSR</span>
        </Link>
        <nav
          className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1"
          aria-label="Main"
        >
          <NavLink to="/" end className={NAV_LINK}>
            Home
          </NavLink>
          <NavLink to="/tasks" className={NAV_LINK}>
            Tasks
          </NavLink>
          <NavLink to="/blog" className={NAV_LINK}>
            Blog
          </NavLink>
          <NavLink to="/about" className={NAV_LINK}>
            About
          </NavLink>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
        <p>
          Built with Vite 8, React 19, React Router 7, Express and Tailwind v4.
        </p>
        <a
          className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
          href="https://vite.dev/guide/ssr"
          target="_blank"
          rel="noreferrer"
        >
          The Vite SSR guide ↗
        </a>
      </div>
    </footer>
  );
}
