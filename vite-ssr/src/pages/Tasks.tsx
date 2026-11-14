import { useEffect, useRef } from "react";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  Link,
  data,
  redirect,
  useActionData,
  useFetcher,
  useFetchers,
  useLoaderData,
  useNavigation,
} from "react-router";
import { api } from "../api.ts";
import { Badge, type BadgeTone } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Spinner } from "../components/Feedback.tsx";
import { errorMessage } from "../shared/errors.ts";
import {
  DEFAULT_PRIORITY,
  PRIORITIES,
  type Priority,
  TASK_FILTERS,
  type Task,
  type TaskFilter,
  filterFromQuery,
  filterLabel,
  percentDone,
  priorityLabel,
  relativeTime,
} from "../shared/models.ts";

/**
 * The task board.
 *
 * - Every change is a `<fetcher.Form>` handled by the route's action, so the
 *   page also works with JavaScript disabled.
 * - The filter lives in the URL (`?filter=active`): it survives a reload and
 *   the back button works.
 * - After each action the router reruns the loader, and while an action is in
 *   flight the rows show the expected result (`fetcher.formData`).
 */

const ADD_FETCHER = "add-task";

export async function tasksLoader({ request }: LoaderFunctionArgs) {
  const filter = filterFromQuery(
    new URL(request.url).searchParams.get("filter"),
  );
  return { filter, list: await api.listTasks(filter) };
}

type Intent = "add" | "toggle" | "delete" | "clear";
export type TaskActionResult =
  { intent: Intent; ok: true } | { intent: Intent; ok: false; error: string };

export async function tasksAction({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent")) as Intent;
  try {
    switch (intent) {
      case "add":
        await api.addTask(
          String(form.get("title") ?? ""),
          String(form.get("priority") ?? ""),
        );
        break;
      case "toggle":
        await api.setTaskDone(
          Number(form.get("id")),
          form.get("done") === "true",
        );
        break;
      case "delete":
        await api.deleteTask(Number(form.get("id")));
        break;
      case "clear":
        await api.clearCompleted();
        break;
      default:
        return data(
          { intent, ok: false, error: "Unknown action" } as TaskActionResult,
          {
            status: 400,
          },
        );
    }
  } catch (error) {
    return data(
      { intent, ok: false, error: errorMessage(error) } as TaskActionResult,
      {
        status: 400,
      },
    );
  }
  // On the server, an action only runs for a plain HTML form post (JavaScript off).
  // Answer with a redirect so a reload does not post the form again.
  if (import.meta.env.SSR) {
    const url = new URL(request.url);
    url.searchParams.delete("index");
    throw redirect(url.pathname + url.search, 303);
  }
  return { intent, ok: true } as TaskActionResult;
}

/** The result of an action for this form, whether it ran through fetch or a full page post. */
function useResult(fetcher: { data?: TaskActionResult }, intent: Intent) {
  const actionData = useActionData<TaskActionResult>();
  return (
    fetcher.data ?? (actionData?.intent === intent ? actionData : undefined)
  );
}

export function TasksPage() {
  const { filter, list } = useLoaderData<typeof tasksLoader>();
  // Errors from a row form posted without JavaScript (with JavaScript, each row shows its own).
  const actionData = useActionData<TaskActionResult>();
  const rowError =
    actionData &&
    !actionData.ok &&
    (actionData.intent === "toggle" || actionData.intent === "delete")
      ? actionData.error
      : null;
  const navigation = useNavigation();
  const busy =
    useFetchers().some((f) => f.state !== "idle") ||
    navigation.state === "loading";
  const { tasks, stats, now } = list;
  const percent = percentDone(stats);
  const counts: Record<TaskFilter, number> = {
    all: stats.total,
    active: stats.active,
    done: stats.done,
  };

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tasks
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Stored on the server, in memory. Open this page in two tabs to see
            it is shared.
          </p>
        </div>
        {busy && <Spinner />}
      </div>

      <Card title="New task">
        <AddTaskForm />
      </Card>

      {rowError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {rowError}
        </p>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <nav className="flex gap-1" aria-label="Filter tasks">
            {TASK_FILTERS.map((f) => (
              <Link
                key={f}
                to={`/tasks?filter=${f}`}
                preventScrollReset
                aria-current={f === filter ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  f === filter
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {filterLabel(f)}
                <span className="tabular-nums opacity-70">{counts[f]}</span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div
              className="h-2 w-32 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
              role="progressbar"
              aria-label="Tasks done"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
              {percent}% done
            </span>
          </div>
        </div>

        <ul className="divide-y divide-zinc-100 px-4 dark:divide-zinc-800">
          <PendingTask />
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} now={now} />
          ))}
        </ul>

        {tasks.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {filter === "done"
              ? "Nothing done yet."
              : filter === "active"
                ? "All clear. Nothing left to do."
                : "No tasks. Add one above."}
          </p>
        )}

        <footer className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span>{stats.active} left</span>
          <ClearCompleted doneCount={stats.done} />
        </footer>
      </section>
    </>
  );
}

function AddTaskForm() {
  const fetcher = useFetcher<TaskActionResult>({ key: ADD_FETCHER });
  const result = useResult(fetcher, "add");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = fetcher.state !== "idle";

  // Clear the field once the server accepted the task.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      formRef.current?.reset();
      inputRef.current?.focus();
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <>
      <fetcher.Form
        ref={formRef}
        method="post"
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input type="hidden" name="intent" value="add" />
        <label className="sr-only" htmlFor="task-title">
          Title
        </label>
        <input
          ref={inputRef}
          id="task-title"
          type="text"
          name="title"
          required
          maxLength={80}
          autoComplete="off"
          placeholder="What needs doing?"
          className="input w-full sm:flex-1"
        />
        <label className="sr-only" htmlFor="task-priority">
          Priority
        </label>
        <select
          id="task-priority"
          name="priority"
          defaultValue={DEFAULT_PRIORITY}
          className="input sm:w-44"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {priorityLabel(p)} priority
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add task"}
        </Button>
      </fetcher.Form>
      {result && !result.ok && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}
    </>
  );
}

/** Optimistic row: shows the task being added before the server answers. */
function PendingTask() {
  const fetcher = useFetcher<TaskActionResult>({ key: ADD_FETCHER });
  // Shown until the list has reloaded with the real row (or the action failed).
  if (fetcher.state === "idle" || !fetcher.formData) return null;
  return (
    <li className="flex animate-pulse items-center gap-3 py-3 opacity-60">
      <span className="size-5 rounded border border-zinc-300 dark:border-zinc-600" />
      <span className="flex-1 text-zinc-700 dark:text-zinc-300">
        {String(fetcher.formData.get("title") ?? "")}
      </span>
      <Spinner />
    </li>
  );
}

const PRIORITY_TONES: Record<Priority, BadgeTone> = {
  high: "red",
  medium: "amber",
  low: "blue",
};

function TaskRow({ task, now }: { task: Task; now: number }) {
  const toggle = useFetcher<TaskActionResult>();
  const remove = useFetcher<TaskActionResult>();

  // While the toggle is in flight (and while the list reloads after it), show the state it asked for.
  const done = toggle.formData
    ? toggle.formData.get("done") === "true"
    : task.done;
  // Hide the row as soon as the delete is sent. If it fails, it comes back with the error.
  const removed = remove.formData !== undefined || remove.data?.ok === true;
  const error =
    (toggle.state === "idle" &&
      toggle.data &&
      !toggle.data.ok &&
      toggle.data.error) ||
    (remove.state === "idle" &&
      remove.data &&
      !remove.data.ok &&
      remove.data.error) ||
    null;

  return (
    <li
      className={`group flex items-center gap-3 py-3 ${removed ? "hidden" : ""}`}
    >
      <toggle.Form method="post" className="flex">
        <input type="hidden" name="intent" value="toggle" />
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="done" value={String(!done)} />
        <button
          type="submit"
          aria-label={`Mark “${task.title}” as ${done ? "not done" : "done"}`}
          aria-pressed={done}
          className={`flex size-5 cursor-pointer items-center justify-center rounded border text-xs transition-colors ${
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-600"
          }`}
        >
          {done && "✓"}
        </button>
      </toggle.Form>
      <div className="min-w-0 flex-1">
        <p
          className={
            done
              ? "truncate text-zinc-400 line-through dark:text-zinc-500"
              : "truncate text-zinc-900 dark:text-zinc-100"
          }
        >
          {task.title}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {relativeTime(task.createdAt, now)}
        </p>
        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
      <Badge tone={PRIORITY_TONES[task.priority]}>
        {priorityLabel(task.priority)}
      </Badge>
      <remove.Form method="post">
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={task.id} />
        <Button
          type="submit"
          variant="danger"
          size="icon"
          aria-label="Delete task"
        >
          <span aria-hidden="true">✕</span>
        </Button>
      </remove.Form>
    </li>
  );
}

function ClearCompleted({ doneCount }: { doneCount: number }) {
  const fetcher = useFetcher<TaskActionResult>();
  const result = useResult(fetcher, "clear");
  return (
    <fetcher.Form method="post" className="flex items-center gap-2">
      {result && !result.ok && (
        <span role="alert" className="text-red-600 dark:text-red-400">
          {result.error}
        </span>
      )}
      <input type="hidden" name="intent" value="clear" />
      <Button
        type="submit"
        variant="ghost"
        size="small"
        disabled={doneCount === 0 || fetcher.state !== "idle"}
      >
        Clear completed
      </Button>
    </fetcher.Form>
  );
}
