/**
 * Server-only state. Only `src/server/functions.ts` imports this file, and the
 * browser reaches those functions through `src/api.ts`, so none of it ends up
 * in the client bundle.
 *
 * A real app would use a database. An in-memory store keeps the demo
 * self-contained: data resets when the server restarts (and in development,
 * when Vite reloads this module after an edit).
 */
import {
  type Priority,
  type Task,
  type TaskFilter,
  type TaskList,
  matchesFilter,
  priorityRank,
} from "../shared/models.ts";

/** Public demo: cap the number of tasks so the list stays small. */
export const MAX_TASKS = 50;
export const MAX_TITLE_CHARS = 80;
/** Simulated latency, so loading states are visible in the demo. */
export const SIMULATED_DELAY_MS = 250;

export const STARTED_AT = Date.now();
let serverCallCount = 0;

export function nowSecs(): number {
  return Math.floor(Date.now() / 1000);
}

/** Counts the call and waits a little, so loading states are visible in the demo. */
export async function serverCall(): Promise<void> {
  serverCallCount += 1;
  if (SIMULATED_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));
  }
}

export function serverCalls(): number {
  return serverCallCount;
}

/** Thrown by the store for input the user can fix. */
export class StoreError extends Error {
  override name = "StoreError";
}

export class TaskStore {
  private tasks: Task[];
  private nextId: number;

  constructor(tasks: Task[]) {
    this.tasks = tasks;
    this.nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
  }

  static seed(now = nowSecs()): TaskStore {
    const seed: [string, Priority, boolean, number][] = [
      ["Read the Vite SSR guide", "high", true, 3 * 86_400],
      ["Add a loader and an action", "high", true, 2 * 86_400],
      ["Try nested routes with <Outlet/>", "medium", false, 5 * 3_600],
      ["Style the app with Tailwind", "medium", false, 40 * 60],
      ["Deploy to Fly.io", "low", false, 90],
    ];
    return new TaskStore(
      seed.map(([title, priority, done, age], i) => ({
        id: i + 1,
        title,
        priority,
        done,
        createdAt: now - age,
      })),
    );
  }

  get size(): number {
    return this.tasks.length;
  }

  list(filter: TaskFilter): TaskList {
    const done = this.tasks.filter((t) => t.done).length;
    const tasks = this.tasks
      .filter((t) => matchesFilter(filter, t))
      // Open tasks first, then by priority, then newest first.
      .sort(
        (a, b) =>
          Number(a.done) - Number(b.done) ||
          priorityRank(a.priority) - priorityRank(b.priority) ||
          b.createdAt - a.createdAt,
      )
      .map((t) => ({ ...t }));
    return {
      tasks,
      stats: {
        total: this.tasks.length,
        active: this.tasks.length - done,
        done,
      },
      now: nowSecs(),
    };
  }

  add(rawTitle: string, priority: Priority): Task {
    const title = rawTitle.trim();
    if (title === "") throw new StoreError("Type a title for the task");
    if ([...title].length > MAX_TITLE_CHARS) {
      throw new StoreError(
        `Keep the title under ${MAX_TITLE_CHARS} characters`,
      );
    }
    if (this.tasks.length >= MAX_TASKS) {
      throw new StoreError(
        `The demo holds ${MAX_TASKS} tasks at most. Delete some first`,
      );
    }
    const lower = title.toLowerCase();
    if (this.tasks.some((t) => !t.done && t.title.toLowerCase() === lower)) {
      throw new StoreError("This task is already on the list");
    }
    const task: Task = {
      id: this.nextId,
      title,
      priority,
      done: false,
      createdAt: nowSecs(),
    };
    this.nextId += 1;
    this.tasks.push(task);
    return { ...task };
  }

  /** Sets the state instead of flipping it, so a repeated submit is harmless. */
  setDone(id: number, done: boolean): Task {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) throw new StoreError("This task no longer exists");
    task.done = done;
    return { ...task };
  }

  delete(id: number): void {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    if (this.tasks.length === before)
      throw new StoreError("This task no longer exists");
  }

  /** Returns how many tasks were removed. */
  clearDone(): number {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => !t.done);
    return before - this.tasks.length;
  }
}

export const tasks = TaskStore.seed();
