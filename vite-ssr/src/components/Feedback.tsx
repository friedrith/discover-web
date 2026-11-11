import type { ReactNode } from "react";

/** Small animated spinner for inline loading states. */
export function Spinner() {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
    />
  );
}

const WIDTHS = ["w-full", "w-5/6", "w-2/3", "w-3/4"];

/** Grey placeholder lines. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-4 rounded bg-zinc-200 dark:bg-zinc-800 ${WIDTHS[i % 4]}`}
        />
      ))}
    </div>
  );
}

/** Shown by error elements and failed requests. */
export function ErrorNotice({
  message,
  children,
}: {
  message: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    >
      <p className="font-medium">{message}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

/** Thin bar at the top of the page while the next route loads. */
export function ProgressBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-x-0 top-0 z-20 h-0.5 origin-left bg-orange-500 transition-transform duration-500 ${
        active ? "scale-x-75 opacity-100" : "scale-x-0 opacity-0"
      }`}
    />
  );
}
