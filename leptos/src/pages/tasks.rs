use leptos::html;
use leptos::prelude::*;
use leptos_meta::Title;
use leptos_router::components::A;
use leptos_router::hooks::use_query_map;

use crate::api::{AddTask, ClearCompleted, DeleteTask, ToggleTask, error_message, list_tasks};
use crate::components::{
    Badge, BadgeTone, Button, ButtonSize, ButtonVariant, Card, Skeleton, Spinner,
};
use crate::models::{Priority, Task, TaskFilter, TaskList, relative_time};

/// The task board.
///
/// - Every change is a server function called through an `ActionForm`, so the
///   page also works with JavaScript disabled.
/// - The filter lives in the URL (`?filter=active`): it survives a reload and
///   the back button works.
/// - The list refetches whenever an action completes (`action.version()`), and
///   the rows show the expected result while the action is still in flight.
#[component]
pub fn TasksPage() -> impl IntoView {
    let query = use_query_map();
    let filter = Memo::new(move |_| TaskFilter::from_query(query.read().get_str("filter")));

    let add = ServerAction::<AddTask>::new();
    let toggle = ServerAction::<ToggleTask>::new();
    let delete = ServerAction::<DeleteTask>::new();
    let clear = ServerAction::<ClearCompleted>::new();

    let tasks = Resource::new(
        move || {
            (
                filter.get(),
                add.version().get(),
                toggle.version().get(),
                delete.version().get(),
                clear.version().get(),
            )
        },
        |(filter, ..)| list_tasks(filter),
    );

    // Errors from the row actions, newest action first.
    let row_error = move || {
        toggle
            .value()
            .get()
            .and_then(Result::err)
            .or_else(|| delete.value().get().and_then(Result::err))
            .or_else(|| clear.value().get().and_then(Result::err))
            .map(|err| error_message(&err))
    };

    view! {
        <Title text="Tasks" />
        <div class="flex items-end justify-between gap-4">
            <div>
                <h1 class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    "Tasks"
                </h1>
                <p class="mt-1 text-zinc-600 dark:text-zinc-400">
                    "Stored on the server, in memory. Open this page in two tabs to see it is shared."
                </p>
            </div>
            <Show when=move || {
                add.pending().get() || toggle.pending().get() || delete.pending().get()
                    || clear.pending().get()
            }>
                <Spinner />
            </Show>
        </div>

        <Card title="New task">
            <AddTaskForm add />
        </Card>

        {move || {
            row_error()
                .map(|message| {
                    view! {
                        <p role="alert" class="text-sm text-red-600 dark:text-red-400">
                            {message}
                        </p>
                    }
                })
        }}

        <section class="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Transition fallback=|| {
                view! {
                    <div class="p-6">
                        <Skeleton lines=4 />
                    </div>
                }
            }>
                {move || Suspend::new(async move {
                    match tasks.await {
                        Ok(list) => {
                            view! { <Board list filter add toggle delete clear /> }.into_any()
                        }
                        Err(err) => {
                            view! {
                                <p class="p-6 text-sm text-red-600">{error_message(&err)}</p>
                            }
                                .into_any()
                        }
                    }
                })}
            </Transition>
        </section>
    }
}

#[component]
fn AddTaskForm(add: ServerAction<AddTask>) -> impl IntoView {
    let input_ref = NodeRef::<html::Input>::new();
    let pending = add.pending();

    // Clear the field after the server accepted the task.
    Effect::new(move |_| {
        if let Some(Ok(_)) = add.value().get()
            && let Some(input) = input_ref.get()
        {
            input.set_value("");
            let _ = input.focus();
        }
    });

    view! {
        <ActionForm action=add attr:class="flex flex-col gap-3 sm:flex-row">
            <label class="sr-only" for="task-title">
                "Title"
            </label>
            <input
                id="task-title"
                node_ref=input_ref
                type="text"
                name="title"
                required
                maxlength="80"
                autocomplete="off"
                placeholder="What needs doing?"
                class="input w-full sm:flex-1"
            />
            <label class="sr-only" for="task-priority">
                "Priority"
            </label>
            <select id="task-priority" name="priority" class="input sm:w-44">
                {Priority::ALL
                    .into_iter()
                    .map(|p| {
                        view! {
                            <option value=p.value() selected=p == Priority::default()>
                                {p.label()} " priority"
                            </option>
                        }
                    })
                    .collect_view()}
            </select>
            <Button button_type="submit" disabled=pending>
                {move || if pending.get() { "Adding…" } else { "Add task" }}
            </Button>
        </ActionForm>
        {move || {
            add.value()
                .get()
                .and_then(Result::err)
                .map(|err| {
                    view! {
                        <p role="alert" class="mt-2 text-sm text-red-600 dark:text-red-400">
                            {error_message(&err)}
                        </p>
                    }
                })
        }}
    }
}

#[component]
fn Board(
    list: TaskList,
    filter: Memo<TaskFilter>,
    add: ServerAction<AddTask>,
    toggle: ServerAction<ToggleTask>,
    delete: ServerAction<DeleteTask>,
    clear: ServerAction<ClearCompleted>,
) -> impl IntoView {
    let TaskList { tasks, stats, now } = list;
    let count_for = move |f: TaskFilter| match f {
        TaskFilter::All => stats.total,
        TaskFilter::Active => stats.active,
        TaskFilter::Done => stats.done,
    };
    let empty = tasks.is_empty();
    let percent = stats.percent_done();

    view! {
        <div class="flex flex-col gap-4 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <nav class="flex gap-1" aria-label="Filter tasks">
                {TaskFilter::ALL
                    .into_iter()
                    .map(|f| {
                        let active = move || filter.get() == f;
                        view! {
                            <A
                                href=format!("/tasks?filter={}", f.query())
                                scroll=false
                                attr:class=move || {
                                    format!(
                                        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {}",
                                        if active() {
                                            "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                        } else {
                                            "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                        },
                                    )
                                }
                            >
                                {f.label()}
                                <span class="tabular-nums opacity-70">{count_for(f)}</span>
                            </A>
                        }
                    })
                    .collect_view()}
            </nav>
            <div class="flex items-center gap-3">
                <div
                    class="h-2 w-32 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                    role="progressbar"
                    aria-label="Tasks done"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow=percent
                >
                    <div
                        class="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style=format!("width: {percent}%")
                    ></div>
                </div>
                <span class="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                    {percent} "% done"
                </span>
            </div>
        </div>

        <ul class="divide-y divide-zinc-100 px-4 dark:divide-zinc-800">
            <PendingTask add />
            {tasks
                .into_iter()
                .map(|task| view! { <TaskRow task now toggle delete /> })
                .collect_view()}
        </ul>

        {empty
            .then(|| {
                view! {
                    <p class="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        {move || match filter.get() {
                            TaskFilter::Done => "Nothing done yet.",
                            TaskFilter::Active => "All clear. Nothing left to do.",
                            TaskFilter::All => "No tasks. Add one above.",
                        }}
                    </p>
                }
            })}

        <footer class="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>{stats.active} " left"</span>
            <ActionForm action=clear>
                <Button
                    button_type="submit"
                    variant=ButtonVariant::Ghost
                    size=ButtonSize::Small
                    disabled=Signal::derive(move || stats.done == 0 || clear.pending().get())
                >
                    "Clear completed"
                </Button>
            </ActionForm>
        </footer>
    }
}

/// Optimistic row: shows the task being added before the server answers.
#[component]
fn PendingTask(add: ServerAction<AddTask>) -> impl IntoView {
    move || {
        add.input().get().map(|input| {
            view! {
                <li class="flex animate-pulse items-center gap-3 py-3 opacity-60">
                    <span class="size-5 rounded border border-zinc-300 dark:border-zinc-600"></span>
                    <span class="flex-1 text-zinc-700 dark:text-zinc-300">{input.title}</span>
                    <Spinner />
                </li>
            }
        })
    }
}

#[component]
fn TaskRow(
    task: Task,
    now: u64,
    toggle: ServerAction<ToggleTask>,
    delete: ServerAction<DeleteTask>,
) -> impl IntoView {
    let Task {
        id,
        title,
        priority,
        done: fetched_done,
        created_at,
    } = task;

    // The latest toggle answer from the server wins over the fetched list,
    // which may still be refetching.
    let settled_done = move || match toggle.value().get() {
        Some(Ok(t)) if t.id == id => t.done,
        _ => fetched_done,
    };
    let toggling = move || toggle.input().get().is_some_and(|input| input.id == id);
    let done = move || {
        if toggling() {
            !settled_done()
        } else {
            settled_done()
        }
    };
    let removed = move || {
        delete.input().get().is_some_and(|input| input.id == id)
            || matches!(delete.value().get(), Some(Ok(deleted)) if deleted == id)
    };

    let tone = match priority {
        Priority::High => BadgeTone::Red,
        Priority::Medium => BadgeTone::Amber,
        Priority::Low => BadgeTone::Blue,
    };
    let title_for_label = title.clone();

    view! {
        <li class="group flex items-center gap-3 py-3" class:hidden=removed>
            <ActionForm action=toggle attr:class="flex">
                <input type="hidden" name="id" value=id />
                <button
                    type="submit"
                    aria-label=move || {
                        format!(
                            "Mark “{title_for_label}” as {}",
                            if done() { "not done" } else { "done" },
                        )
                    }
                    aria-pressed=move || done().to_string()
                    class=move || {
                        format!(
                            "flex size-5 cursor-pointer items-center justify-center rounded border text-xs transition-colors {}",
                            if done() {
                                "border-emerald-500 bg-emerald-500 text-white"
                            } else {
                                "border-zinc-300 hover:border-zinc-500 dark:border-zinc-600"
                            },
                        )
                    }
                >
                    {move || done().then_some("✓")}
                </button>
            </ActionForm>
            <div class="min-w-0 flex-1">
                <p class=move || {
                    if done() {
                        "truncate text-zinc-400 line-through dark:text-zinc-500"
                    } else {
                        "truncate text-zinc-900 dark:text-zinc-100"
                    }
                }>{title}</p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                    {relative_time(created_at, now)}
                </p>
            </div>
            <Badge tone>{priority.label()}</Badge>
            <ActionForm action=delete>
                <input type="hidden" name="id" value=id />
                <Button
                    button_type="submit"
                    variant=ButtonVariant::Danger
                    size=ButtonSize::Icon
                    aria_label="Delete task"
                >
                    <span aria-hidden="true">"✕"</span>
                </Button>
            </ActionForm>
        </li>
    }
}
