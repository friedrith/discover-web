/** Browser entry: attaches React to the server-rendered HTML. */
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { type HydrationState, createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { routes } from "./routes.tsx";

declare global {
  interface Window {
    /** Written by `<StaticRouterProvider>` during SSR: the loader data of the first page. */
    __staticRouterHydrationData?: HydrationState;
  }
}

const router = createBrowserRouter(routes, {
  hydrationData: window.__staticRouterHydrationData,
});

hydrateRoot(
  document.getElementById("root")!,
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
