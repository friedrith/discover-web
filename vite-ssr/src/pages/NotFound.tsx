import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-6xl font-bold text-zinc-300 dark:text-zinc-700">404</p>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Page not found
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        This address does not match any route.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Go home
      </Link>
    </div>
  );
}
