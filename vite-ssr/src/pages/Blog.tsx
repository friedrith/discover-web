import { type ReactNode, useEffect, useRef } from "react";
import {
  Form,
  Link,
  type LoaderFunctionArgs,
  Outlet,
  data,
  isRouteErrorResponse,
  useLoaderData,
  useNavigation,
  useRouteError,
  useSubmit,
} from "react-router";
import { api } from "../api.ts";
import { Badge } from "../components/Badge.tsx";
import { ErrorNotice, Spinner } from "../components/Feedback.tsx";
import { ServerFnError, errorMessage } from "../shared/errors.ts";
import type { PostDetail, PostLink, PostSummary } from "../shared/models.ts";

/** Parent route for `/blog` and `/blog/:slug`: the header stays, the `<Outlet/>` changes. */
export function BlogLayout() {
  return (
    <>
      <header className="flex flex-col gap-1 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <Link
          to="/blog"
          className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          Blog
        </Link>
        <p className="text-zinc-600 dark:text-zinc-400">
          Short notes on how this site is built. The posts come from a server
          function.
        </p>
      </header>
      <Outlet />
    </>
  );
}

// ---------------------------------------------------------------------------
// Index: /blog?q=…&tag=…
// ---------------------------------------------------------------------------

export async function postListLoader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const tag = params.get("tag") || null;
  return { q, tag, index: await api.listPosts(q, tag) };
}

export function PostList() {
  const { q, tag, index } = useLoaderData<typeof postListLoader>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const inputRef = useRef<HTMLInputElement>(null);
  const searching =
    navigation.state === "loading" && navigation.location.pathname === "/blog";

  // Keep the field in sync when the URL changes another way (a tag chip, the back button),
  // but never while the user is typing in it.
  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement !== input) input.value = q;
  }, [q]);

  return (
    <>
      {/* A GET form handled by the router: submitting it only changes the query string. */}
      <Form
        method="get"
        action="/blog"
        role="search"
        className="flex items-center gap-3"
      >
        <label className="sr-only" htmlFor="post-search">
          Search posts
        </label>
        <input
          ref={inputRef}
          id="post-search"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search posts…"
          className="input flex-1"
          // Submits on every keystroke; `replace` keeps the history clean.
          onChange={(event) =>
            submit(event.currentTarget.form, {
              replace: true,
              preventScrollReset: true,
            })
          }
        />
        {tag && <input type="hidden" name="tag" value={tag} />}
        {searching && <Spinner />}
      </Form>

      <TagFilter tags={index.tags} active={tag} />
      <PostCards posts={index.posts} />
    </>
  );
}

function TagFilter({
  tags,
  active,
}: {
  tags: string[];
  active: string | null;
}) {
  const chip = (to: string, label: string, selected: boolean) => (
    <Link
      key={to}
      to={to}
      preventScrollReset
      aria-current={selected ? "page" : undefined}
      className={
        selected
          ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Filter by tag">
      {chip("/blog", "All", active === null)}
      {tags.map((t) =>
        chip(`/blog?tag=${encodeURIComponent(t)}`, `#${t}`, active === t),
      )}
    </nav>
  );
}

function PostCards({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No post matches this search.
      </p>
    );
  }
  return (
    <ul className="grid gap-4">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            to={`/blog/${post.slug}`}
            className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <PostMeta post={post} />
            <h2 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {post.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
              {renderInlineCode(post.excerpt)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PostMeta({ post }: { post: PostSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <time dateTime={post.date}>{post.date}</time>
      <span aria-hidden="true">·</span>
      <span>{post.readingMinutes} min read</span>
      {post.tags.map((t) => (
        <Badge key={t}>{t}</Badge>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post: /blog/:slug
// ---------------------------------------------------------------------------

export async function postLoader({
  params,
}: LoaderFunctionArgs): Promise<PostDetail> {
  try {
    return await api.getPost(params.slug ?? "");
  } catch (error) {
    // A thrown response renders the route's errorElement, with this status on the server.
    if (error instanceof ServerFnError)
      throw data(error.message, { status: 404 });
    throw error;
  }
}

export function PostPage() {
  const { summary, body, previous, next } = useLoaderData<typeof postLoader>();
  return (
    <>
      <article className="flex flex-col gap-4">
        <PostMeta post={summary} />
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {summary.title}
        </h1>
        {body.map((paragraph, i) => (
          <p key={i} className="leading-7 text-zinc-700 dark:text-zinc-300">
            {renderInlineCode(paragraph)}
          </p>
        ))}
      </article>
      <nav
        className="grid gap-4 border-t border-zinc-200 pt-6 sm:grid-cols-2 dark:border-zinc-800"
        aria-label="More posts"
      >
        <div>
          {previous && <Neighbour link={previous} label="← Previous" />}
        </div>
        <div className="sm:text-right">
          {next && <Neighbour link={next} label="Next →" />}
        </div>
      </nav>
    </>
  );
}

/** errorElement of the post route: the blog header stays, only the outlet shows the error. */
export function PostError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? String(error.data)
    : errorMessage(error);
  return (
    <ErrorNotice message={message}>
      <Link to="/blog" className="underline">
        Back to all posts
      </Link>
    </ErrorNotice>
  );
}

function Neighbour({ link, label }: { link: PostLink; label: string }) {
  return (
    <Link to={`/blog/${link.slug}`} className="group block">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="block font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
        {link.title}
      </span>
    </Link>
  );
}

/**
 * Turns `code` spans into `<code>` elements. Everything else stays text, so
 * nothing from the post is ever parsed as HTML.
 */
export function renderInlineCode(text: string): ReactNode[] {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
      >
        {part}
      </code>
    ) : (
      part
    ),
  );
}
