/**
 * Page titles and descriptions.
 *
 * Each route declares them in its `handle`. The server writes them into the
 * HTML `<head>` (see `entry-server.tsx`), and `<DocumentMeta/>` updates
 * `document.title` after client-side navigations.
 */
import { useEffect } from "react";

export const SITE_NAME = "Discover Vite SSR";
export const DEFAULT_DESCRIPTION =
  "A TypeScript fullstack demo: Vite SSR, React, React Router, Express and Tailwind.";

export interface RouteHandle {
  /** `data` is the route's loader data, or undefined when the route failed. */
  title?: (data: unknown) => string;
  description?: (data: unknown) => string | undefined;
}

export interface PageMeta {
  title: string;
  description: string;
}

export function formatTitle(page: string): string {
  return `${page} · ${SITE_NAME}`;
}

/** The deepest route that has something to say wins. */
export function metaFromMatches(
  matches: { handle?: unknown; data: unknown }[],
  fallbackTitle = SITE_NAME,
): PageMeta {
  let title: string | undefined;
  let description: string | undefined;
  for (const match of [...matches].reverse()) {
    const handle = match.handle as RouteHandle | undefined;
    title ??= handle?.title?.(match.data);
    description ??= handle?.description?.(match.data);
  }
  return {
    title: title ? formatTitle(title) : fallbackTitle,
    description: description ?? DEFAULT_DESCRIPTION,
  };
}

export function useDocumentMeta({ title, description }: PageMeta): void {
  useEffect(() => {
    document.title = title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
  }, [title, description]);
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]!);
}

/** The tags the server puts in place of `<!--app-head-->`. */
export function renderHeadTags({ title, description }: PageMeta): string {
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  ].join("\n    ");
}
