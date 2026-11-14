import { describe, expect, it } from "vitest";
import { findPost, postCount, searchPosts } from "./posts.ts";
import { MAX_TITLE_CHARS, StoreError, TaskStore } from "./store.ts";

describe("TaskStore", () => {
  it("validates new tasks", () => {
    const store = TaskStore.seed();
    expect(() => store.add("   ", "low")).toThrow(StoreError);
    expect(() => store.add("x".repeat(MAX_TITLE_CHARS + 1), "low")).toThrow(
      StoreError,
    );
    expect(() => store.add("deploy to FLY.io", "low")).toThrow(
      "already on the list",
    );
    expect(store.add("  Write tests  ", "high").title).toBe("Write tests");
  });

  it("updates, deletes and clears", () => {
    const store = TaskStore.seed();
    const total = store.size;
    expect(store.setDone(5, true).done).toBe(true);
    store.delete(1);
    expect(() => store.delete(1)).toThrow("no longer exists");
    expect(store.clearDone()).toBe(2); // seeded task 2 and task 5
    expect(store.size).toBe(total - 3);
  });

  it("lists open tasks first, then by priority", () => {
    const store = TaskStore.seed();
    const list = store.list("all");
    expect(list.stats).toEqual({ total: 5, active: 3, done: 2 });
    expect(list.tasks[0]?.done).toBe(false);
    expect(list.tasks.at(-1)?.done).toBe(true);
    expect(store.list("done").tasks).toHaveLength(2);
  });

  it("returns copies, so callers cannot change the store", () => {
    const store = TaskStore.seed();
    store.list("all").tasks[0]!.title = "changed";
    expect(store.list("all").tasks[0]?.title).not.toBe("changed");
  });
});

describe("posts", () => {
  it("searches and filters by tag", () => {
    expect(searchPosts("", null).posts).toHaveLength(postCount());
    expect(searchPosts("OUTLET", null).posts).toHaveLength(1);
    expect(
      searchPosts("", "server").posts.every((p) => p.tags.includes("server")),
    ).toBe(true);
  });

  it("links neighbours", () => {
    const first = findPost("one-codebase-two-builds");
    expect(first?.previous).toBeNull();
    expect(first?.next?.slug).toBe("loaders-and-actions");
    expect(findPost("missing")).toBeNull();
  });
});
