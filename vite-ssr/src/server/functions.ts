/**
 * Server functions: the only way the browser reaches server data.
 *
 * - During SSR, loaders and actions call them directly (see `src/api.ts`).
 * - In the browser, `src/api.ts` turns each call into `POST /_rpc/:name`, and
 *   `handleRpc` in `src/entry-server.tsx` runs the function here.
 *
 * The parameter types are what callers in this codebase must pass. Arguments
 * that come over the network are untrusted though, so every function still
 * checks them at runtime before using them.
 */
import { ServerFnError } from "../shared/errors.ts";
import {
  type Greeting,
  type PostDetail,
  type PostIndex,
  type ServerInfo,
  type Task,
  type TaskFilter,
  type TaskList,
  filterFromQuery,
  parsePriority,
} from "../shared/models.ts";
import { findPost, postCount, searchPosts } from "./posts.ts";
import {
  STARTED_AT,
  StoreError,
  serverCall,
  serverCalls,
  tasks,
} from "./store.ts";

function asString(value: unknown): string {
  if (typeof value !== "string") throw new ServerFnError("Invalid input");
  return value;
}

function asId(value: unknown): number {
  const id = typeof value === "string" ? Number(value) : value;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) {
    throw new ServerFnError("Invalid input");
  }
  return id;
}

/** Store errors are meant for the user; pass their message through. */
function userFacing<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof StoreError) throw new ServerFnError(error.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

async function greet(name: string): Promise<Greeting> {
  await serverCall();
  const trimmed = asString(name).trim();
  if (trimmed === "") throw new ServerFnError("Please type a name");
  return {
    message: `Hello ${trimmed}, this was computed by the Node server`,
    nameLength: [...trimmed].length,
  };
}

async function fetchServerInfo(): Promise<ServerInfo> {
  await serverCall();
  return {
    uptimeSecs: Math.floor((Date.now() - STARTED_AT) / 1000),
    serverCalls: serverCalls(),
    os: process.platform,
    arch: process.arch,
    runtime: `Node ${process.versions.node}`,
    taskCount: tasks.size,
    postCount: postCount(),
  };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/**
 * No artificial delay here: the list reloads after every change, and the
 * optimistic UI on the task board covers the time the changes take.
 */
async function listTasks(filter: TaskFilter): Promise<TaskList> {
  return tasks.list(
    filterFromQuery(typeof filter === "string" ? filter : null),
  );
}

async function addTask(title: string, priority: string): Promise<Task> {
  await serverCall();
  const parsed = parsePriority(priority);
  if (!parsed) throw new ServerFnError("Unknown priority");
  const text = asString(title);
  return userFacing(() => tasks.add(text, parsed));
}

async function setTaskDone(id: number, done: boolean): Promise<Task> {
  await serverCall();
  const taskId = asId(id);
  if (typeof done !== "boolean") throw new ServerFnError("Invalid input");
  return userFacing(() => tasks.setDone(taskId, done));
}

/** Returns the id of the deleted task. */
async function deleteTask(id: number): Promise<number> {
  await serverCall();
  const taskId = asId(id);
  userFacing(() => tasks.delete(taskId));
  return taskId;
}

/** Returns how many tasks were removed. */
async function clearCompleted(): Promise<number> {
  await serverCall();
  return tasks.clearDone();
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

async function listPosts(
  query: string,
  tag: string | null,
): Promise<PostIndex> {
  await serverCall();
  const tagFilter = typeof tag === "string" && tag !== "" ? tag : null;
  return searchPosts(typeof query === "string" ? query : "", tagFilter);
}

async function getPost(slug: string): Promise<PostDetail> {
  await serverCall();
  const post = findPost(asString(slug));
  if (!post) throw new ServerFnError("This post does not exist");
  return post;
}

export const serverFunctions = {
  greet,
  fetchServerInfo,
  listTasks,
  addTask,
  setTaskDone,
  deleteTask,
  clearCompleted,
  listPosts,
  getPost,
};

export type ServerFunctions = typeof serverFunctions;
