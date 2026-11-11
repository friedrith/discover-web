/** Blog posts. Server only, like the task store. */
import type {
  PostDetail,
  PostIndex,
  PostLink,
  PostSummary,
} from "../shared/models.ts";

interface StoredPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  body: string[];
}

const POSTS: StoredPost[] = [
  {
    slug: "one-codebase-two-builds",
    title: "One codebase, two builds",
    date: "2026-09-02",
    tags: ["architecture", "vite"],
    body: [
      "Vite builds this app twice. `vite build` bundles the browser code, starting from `index.html` and `src/entry-client.tsx`. `vite build --ssr src/entry-server.tsx` bundles the server code that renders HTML and answers server function calls.",
      "In development there is no bundle. Express runs Vite in middleware mode, and `ssrLoadModule` loads the server entry on each request, so an edit applies on the next page load.",
      "Vite replaces `import.meta.env.SSR` with `true` or `false` at build time. The branch that imports the server functions is dropped from the client bundle, so the task store never reaches the browser.",
    ],
  },
  {
    slug: "loaders-and-actions",
    title: "Loaders and actions replace your API layer",
    date: "2026-09-16",
    tags: ["server", "architecture"],
    body: [
      "Each route has a `loader` that fetches its data before rendering and an `action` that handles its form submissions. On the first request, the server runs them with React Router's static handler. After hydration, the router runs them in the browser.",
      "Both call the same functions in `src/api.ts`. On the server, a call goes straight to `src/server/functions.ts`. In the browser, it becomes a `fetch` to `/_rpc/:name`, and the types come from the server module, so a renamed field fails the type check on both sides.",
      "A `<fetcher.Form>` is a real HTML form. With JavaScript off, it posts to the server, the action runs there, and the server answers with a redirect, so the task board works before the client bundle has loaded.",
    ],
  },
  {
    slug: "hydration",
    title: "Hydration, not a second render",
    date: "2026-10-01",
    tags: ["react", "performance"],
    body: [
      "`hydrateRoot` attaches React to the HTML the server sent instead of replacing it. The router reads the loader data from `window.__staticRouterHydrationData`, so the page does not fetch its data a second time.",
      "The first client render must produce the same markup as the server. Anything that differs, such as the current time or a value from `localStorage`, causes a mismatch.",
      "The task board avoids it by sending the server's clock with the list. The theme toggle renders both icons and lets the `dark:` classes pick one, so the server never needs to know your theme.",
    ],
  },
  {
    slug: "pending-and-optimistic-ui",
    title: "Pending states and optimistic UI",
    date: "2026-10-20",
    tags: ["react", "server"],
    body: [
      "`useNavigation()` says when the next page is loading, and `useFetcher()` exposes its `state` and the `formData` it is submitting. Neither needs extra state of your own.",
      "The task board renders the submitted form data as if the server had already answered: a new row, a ticked box, a row that disappears. After each action the router reruns the loaders on the page, and the real data replaces the guess.",
      "A loader can throw a response, such as `data(message, { status: 404 })`. The nearest `errorElement` renders instead of the route, as on the page for a post that does not exist, and the server answers with a real 404 status.",
    ],
  },
  {
    slug: "nested-routing",
    title: "Nested routes and layouts",
    date: "2026-11-03",
    tags: ["routing"],
    body: [
      "A route with `children` renders a layout and an `<Outlet/>` where the child route goes. This blog uses one: the header stays in place while you move between the index and a post.",
      "Route parameters such as `:slug` arrive in the loader's `params`, and the query string is in `request.url`. The search box is a GET form, so the URL always describes the results on screen.",
      '`<NavLink>` sets `aria-current="page"` on the active link. The navigation bar styles it with Tailwind\'s `aria-[current=page]:` variant.',
    ],
  },
];

function summary(post: StoredPost): PostSummary {
  const words = post.body.reduce(
    (sum, p) => sum + p.split(/\s+/).filter(Boolean).length,
    0,
  );
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.body[0] ?? "",
    date: post.date,
    tags: [...post.tags],
    // About 200 words per minute, at least one minute.
    readingMinutes: Math.max(1, Math.ceil(words / 200)),
  };
}

function link(post: StoredPost | undefined): PostLink | null {
  return post ? { slug: post.slug, title: post.title } : null;
}

function matches(post: StoredPost, query: string, tag: string | null): boolean {
  const tagOk = tag === null || post.tags.includes(tag);
  const queryOk =
    query === "" ||
    post.title.toLowerCase().includes(query) ||
    post.body.some((p) => p.toLowerCase().includes(query));
  return tagOk && queryOk;
}

export function postCount(): number {
  return POSTS.length;
}

export function searchPosts(rawQuery: string, tag: string | null): PostIndex {
  const query = rawQuery.trim().toLowerCase();
  const tags = [...new Set(POSTS.flatMap((p) => p.tags))].sort();
  return {
    posts: POSTS.filter((p) => matches(p, query, tag)).map(summary),
    tags,
  };
}

export function findPost(slug: string): PostDetail | null {
  const index = POSTS.findIndex((p) => p.slug === slug);
  const post = POSTS[index];
  if (!post) return null;
  return {
    summary: summary(post),
    body: [...post.body],
    previous: link(POSTS[index - 1]),
    next: link(POSTS[index + 1]),
  };
}
