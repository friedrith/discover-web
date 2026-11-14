/** Renders real requests through the server entry, the way `server.ts` does. */
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { handleRpc, render } from "./entry-server.tsx";

async function page(path: string) {
  const result = await render(new Request(`http://localhost${path}`));
  if (result.kind !== "page")
    throw new Error(`Expected a page, got ${result.response.status}`);
  return {
    status: result.status,
    head: result.head,
    html: renderToString(result.app),
  };
}

function post(path: string, fields: Record<string, string>) {
  return render(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields),
    }),
  );
}

describe("server rendering", () => {
  it("renders the task board with its data and title", async () => {
    const { status, head, html } = await page("/tasks?filter=active");
    expect(status).toBe(200);
    expect(head).toContain("<title>Tasks · Discover Vite SSR</title>");
    expect(html).toContain("Style the app with Tailwind");
    expect(html).not.toContain("Read the Vite SSR guide"); // done, so filtered out
    expect(html).toContain("__staticRouterHydrationData");
  });

  it("answers 404 for unknown pages and posts", async () => {
    const unknown = await page("/nope");
    expect(unknown.status).toBe(404);
    expect(unknown.head).toContain("Page not found");

    const missing = await page("/blog/missing");
    expect(missing.status).toBe(404);
    expect(missing.head).toContain("Post not found");
    expect(missing.html).toContain("This post does not exist");
  });

  it("escapes post titles in the head", async () => {
    const { head } = await page("/blog/nested-routing");
    expect(head).toContain(
      "<title>Nested routes and layouts · Discover Vite SSR</title>",
    );
    expect(head).not.toContain("`");
  });

  it("redirects after a form post without JavaScript", async () => {
    const result = await post("/tasks?filter=active", {
      intent: "add",
      title: "From a test",
      priority: "low",
    });
    expect(result.kind).toBe("response");
    if (result.kind !== "response") return;
    expect(result.response.status).toBe(303);
    expect(result.response.headers.get("location")).toBe(
      "/tasks?filter=active",
    );
    expect((await page("/tasks")).html).toContain("From a test");
  });

  it("re-renders the form with the error when the input is invalid", async () => {
    const result = await post("/tasks", {
      intent: "add",
      title: " ",
      priority: "low",
    });
    if (result.kind !== "page") throw new Error("Expected a page");
    expect(result.status).toBe(400);
    expect(renderToString(result.app)).toContain("Type a title for the task");
  });
});

describe("RPC endpoint", () => {
  it("runs known functions and hides unknown ones", async () => {
    expect((await handleRpc("listTasks", ["done"])).status).toBe(200);
    expect(await handleRpc("constructor", [])).toEqual({
      status: 404,
      body: { error: "Unknown server function" },
    });
    expect(await handleRpc("addTask", ["x", "urgent"])).toEqual({
      status: 400,
      body: { error: "Unknown priority" },
    });
    expect((await handleRpc("deleteTask", ["1; drop"])).status).toBe(400);
  });
});
