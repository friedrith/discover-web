/**
 * Types shared by the server and the browser.
 *
 * Each type is defined once. The server functions return them, the RPC layer
 * sends them as JSON, and the components read them, so both sides agree on the shape.
 */

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type Priority = "low" | "medium" | "high";

export const PRIORITIES: readonly Priority[] = ["low", "medium", "high"];
export const DEFAULT_PRIORITY: Priority = "medium";

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function priorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority];
}

export function parsePriority(value: unknown): Priority | null {
  return PRIORITIES.find((p) => p === value) ?? null;
}

/** Higher first when sorting. */
export function priorityRank(priority: Priority): number {
  return { high: 0, medium: 1, low: 2 }[priority];
}

export interface Task {
  id: number;
  title: string;
  priority: Priority;
  done: boolean;
  /** Unix time, in seconds. */
  createdAt: number;
}

export type TaskFilter = "all" | "active" | "done";

export const TASK_FILTERS: readonly TaskFilter[] = ["all", "active", "done"];

const FILTER_LABELS: Record<TaskFilter, string> = {
  all: "All",
  active: "Active",
  done: "Done",
};

export function filterLabel(filter: TaskFilter): string {
  return FILTER_LABELS[filter];
}

/** Reads the `?filter=` query parameter. Unknown values fall back to `all`. */
export function filterFromQuery(value: string | null | undefined): TaskFilter {
  return TASK_FILTERS.find((f) => f === value) ?? "all";
}

export function matchesFilter(filter: TaskFilter, task: Task): boolean {
  if (filter === "active") return !task.done;
  if (filter === "done") return task.done;
  return true;
}

export interface TaskStats {
  total: number;
  active: number;
  done: number;
}

export function percentDone(stats: TaskStats): number {
  return stats.total === 0 ? 0 : Math.floor((stats.done * 100) / stats.total);
}

export interface TaskList {
  tasks: Task[];
  stats: TaskStats;
  /**
   * Server time when the list was built. Relative dates ("5 min ago") are
   * computed from it, so the server HTML and the hydrated client match.
   */
  now: number;
}

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function relativeTime(then: number, now: number): string {
  const secs = Math.max(0, now - then);
  if (secs < 60) return "just now";
  if (secs < 3_600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86_400) return `${Math.floor(secs / 3_600)} h ago`;
  return `${Math.floor(secs / 86_400)} d ago`;
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export interface PostSummary {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  readingMinutes: number;
}

export interface PostLink {
  slug: string;
  title: string;
}

export interface PostDetail {
  summary: PostSummary;
  body: string[];
  previous: PostLink | null;
  next: PostLink | null;
}

export interface PostIndex {
  posts: PostSummary[];
  /** Every tag across all posts, for the filter chips. */
  tags: string[];
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

export interface Greeting {
  message: string;
  nameLength: number;
}

export interface ServerInfo {
  uptimeSecs: number;
  serverCalls: number;
  os: string;
  arch: string;
  runtime: string;
  taskCount: number;
  postCount: number;
}
