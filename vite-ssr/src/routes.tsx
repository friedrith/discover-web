import {
  Outlet,
  ScrollRestoration,
  isRouteErrorResponse,
  useMatches,
  useRouteError,
} from "react-router";
import type { RouteObject } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { ErrorNotice } from "./components/Feedback.tsx";
import {
  DEFAULT_DESCRIPTION,
  type RouteHandle,
  formatTitle,
  metaFromMatches,
  useDocumentMeta,
} from "./meta.ts";
import { AboutPage } from "./pages/About.tsx";
import {
  BlogLayout,
  PostError,
  PostList,
  PostPage,
  postListLoader,
  postLoader,
} from "./pages/Blog.tsx";
import { HomePage, homeAction, homeLoader } from "./pages/Home.tsx";
import { NotFound } from "./pages/NotFound.tsx";
import { TasksPage, tasksAction, tasksLoader } from "./pages/Tasks.tsx";
import type { PostDetail } from "./shared/models.ts";

/**
 * The route tree, shared by the server (`createStaticHandler`) and the
 * browser (`createBrowserRouter`).
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Root />,
    errorElement: <RootError />,
    children: [
      {
        index: true,
        element: <HomePage />,
        loader: homeLoader,
        action: homeAction,
        handle: { title: () => "Home" } satisfies RouteHandle,
      },
      {
        path: "tasks",
        element: <TasksPage />,
        loader: tasksLoader,
        action: tasksAction,
        handle: { title: () => "Tasks" } satisfies RouteHandle,
      },
      {
        path: "blog",
        element: <BlogLayout />,
        children: [
          {
            index: true,
            element: <PostList />,
            loader: postListLoader,
            handle: { title: () => "Blog" } satisfies RouteHandle,
          },
          {
            path: ":slug",
            element: <PostPage />,
            loader: postLoader,
            errorElement: <PostError />,
            handle: {
              title: (data) =>
                (data as PostDetail | undefined)?.summary.title ??
                "Post not found",
              description: (data) =>
                (data as PostDetail | undefined)?.summary.excerpt.replaceAll(
                  "`",
                  "",
                ),
            } satisfies RouteHandle,
          },
        ],
      },
      {
        path: "about",
        element: <AboutPage />,
        handle: { title: () => "How it works" } satisfies RouteHandle,
      },
    ],
  },
];

function Root() {
  const matches = useMatches();
  useDocumentMeta(
    metaFromMatches(
      matches.map((m) => ({ handle: m.handle, data: m.loaderData })),
    ),
  );
  return (
    <Layout>
      <Outlet />
      <ScrollRestoration />
    </Layout>
  );
}

/** Unknown URLs (404) and errors no route caught. The layout stays. */
function RootError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  useDocumentMeta({
    title: formatTitle(notFound ? "Page not found" : "Something went wrong"),
    description: DEFAULT_DESCRIPTION,
  });
  if (!notFound) console.error(error);
  return (
    <Layout>
      {notFound ? (
        <NotFound />
      ) : (
        <ErrorNotice message="Something went wrong. Try reloading the page." />
      )}
    </Layout>
  );
}

/** Title for the server-rendered `<head>` when a route failed. */
export function errorTitle(status: number): string {
  return formatTitle(
    status === 404 ? "Page not found" : "Something went wrong",
  );
}
