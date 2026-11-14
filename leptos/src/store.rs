//! Server-only state. Compiled only with the `ssr` feature, so none of it ends
//! up in the WASM bundle.
//!
//! A real app would use a database (for example `sqlx` with SQLite or Postgres).
//! An in-memory store keeps the demo self-contained: data resets on restart.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{LazyLock, Mutex, MutexGuard};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use crate::models::{
    PostDetail, PostIndex, PostLink, PostSummary, Priority, Task, TaskFilter, TaskList, TaskStats,
};

/// Public demo: cap the number of tasks so the list stays small.
pub const MAX_TASKS: usize = 50;
pub const MAX_TITLE_CHARS: usize = 80;

pub static STARTED: LazyLock<Instant> = LazyLock::new(Instant::now);
static SERVER_CALLS: AtomicU64 = AtomicU64::new(0);
static TASKS: LazyLock<Mutex<TaskStore>> = LazyLock::new(|| Mutex::new(TaskStore::seed()));
static POSTS: LazyLock<Vec<StoredPost>> = LazyLock::new(seed_posts);

pub fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or_default()
}

/// Counts the call and waits a little, so loading states are visible in the demo.
pub async fn server_call() {
    SERVER_CALLS.fetch_add(1, Ordering::Relaxed);
    tokio::time::sleep(Duration::from_millis(250)).await;
}

pub fn server_calls() -> u64 {
    SERVER_CALLS.load(Ordering::Relaxed)
}

pub fn tasks() -> MutexGuard<'static, TaskStore> {
    // A panic while holding the lock leaves valid data here, so recover from poisoning.
    TASKS
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

pub struct TaskStore {
    tasks: Vec<Task>,
    next_id: u32,
}

impl TaskStore {
    fn seed() -> Self {
        let now = now_secs();
        let seed = [
            ("Read the Leptos book", Priority::High, true, 3 * 86_400),
            ("Add a server function", Priority::High, true, 2 * 86_400),
            (
                "Try nested routes with <Outlet/>",
                Priority::Medium,
                false,
                5 * 3_600,
            ),
            (
                "Style the app with Tailwind",
                Priority::Medium,
                false,
                40 * 60,
            ),
            ("Deploy to Fly.io", Priority::Low, false, 90),
        ];
        let tasks = seed
            .into_iter()
            .zip(1..)
            .map(|((title, priority, done, age), id)| Task {
                id,
                title: title.to_string(),
                priority,
                done,
                created_at: now - age,
            })
            .collect::<Vec<_>>();
        let next_id = tasks.len() as u32 + 1;
        Self { tasks, next_id }
    }

    pub fn len(&self) -> usize {
        self.tasks.len()
    }

    pub fn is_empty(&self) -> bool {
        self.tasks.is_empty()
    }

    pub fn list(&self, filter: TaskFilter) -> TaskList {
        let done = self.tasks.iter().filter(|t| t.done).count();
        let stats = TaskStats {
            total: self.tasks.len(),
            active: self.tasks.len() - done,
            done,
        };
        let mut tasks: Vec<Task> = self
            .tasks
            .iter()
            .filter(|t| filter.matches(t))
            .cloned()
            .collect();
        // Open tasks first, then by priority, then newest first.
        tasks.sort_by_key(|t| (t.done, t.priority.rank(), std::cmp::Reverse(t.created_at)));
        TaskList {
            tasks,
            stats,
            now: now_secs(),
        }
    }

    pub fn add(&mut self, title: &str, priority: Priority) -> Result<Task, String> {
        let title = title.trim();
        if title.is_empty() {
            return Err("Type a title for the task".into());
        }
        if title.chars().count() > MAX_TITLE_CHARS {
            return Err(format!("Keep the title under {MAX_TITLE_CHARS} characters"));
        }
        if self.tasks.len() >= MAX_TASKS {
            return Err(format!(
                "The demo holds {MAX_TASKS} tasks at most. Delete some first"
            ));
        }
        if self
            .tasks
            .iter()
            .any(|t| !t.done && t.title.eq_ignore_ascii_case(title))
        {
            return Err("This task is already on the list".into());
        }
        let task = Task {
            id: self.next_id,
            title: title.to_string(),
            priority,
            done: false,
            created_at: now_secs(),
        };
        self.next_id += 1;
        self.tasks.push(task.clone());
        Ok(task)
    }

    pub fn toggle(&mut self, id: u32) -> Result<Task, String> {
        let task = self
            .tasks
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or("This task no longer exists")?;
        task.done = !task.done;
        Ok(task.clone())
    }

    pub fn delete(&mut self, id: u32) -> Result<(), String> {
        let before = self.tasks.len();
        self.tasks.retain(|t| t.id != id);
        if self.tasks.len() == before {
            return Err("This task no longer exists".into());
        }
        Ok(())
    }

    /// Returns how many tasks were removed.
    pub fn clear_done(&mut self) -> usize {
        let before = self.tasks.len();
        self.tasks.retain(|t| !t.done);
        before - self.tasks.len()
    }
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

struct StoredPost {
    slug: &'static str,
    title: &'static str,
    date: &'static str,
    tags: &'static [&'static str],
    body: &'static [&'static str],
}

impl StoredPost {
    fn summary(&self) -> PostSummary {
        let words: usize = self.body.iter().map(|p| p.split_whitespace().count()).sum();
        PostSummary {
            slug: self.slug.to_string(),
            title: self.title.to_string(),
            excerpt: self.body.first().copied().unwrap_or_default().to_string(),
            date: self.date.to_string(),
            tags: self.tags.iter().map(|t| t.to_string()).collect(),
            // About 200 words per minute, at least one minute.
            reading_minutes: (words as u32).div_ceil(200).max(1),
        }
    }

    fn link(&self) -> PostLink {
        PostLink {
            slug: self.slug.to_string(),
            title: self.title.to_string(),
        }
    }

    fn matches(&self, query: &str, tag: Option<&str>) -> bool {
        let tag_ok = tag.is_none_or(|tag| self.tags.contains(&tag));
        let query_ok = query.is_empty()
            || self.title.to_lowercase().contains(query)
            || self.body.iter().any(|p| p.to_lowercase().contains(query));
        tag_ok && query_ok
    }
}

pub fn post_count() -> usize {
    POSTS.len()
}

pub fn search_posts(query: &str, tag: Option<&str>) -> PostIndex {
    let query = query.trim().to_lowercase();
    let posts = POSTS
        .iter()
        .filter(|p| p.matches(&query, tag))
        .map(StoredPost::summary)
        .collect();
    let mut tags: Vec<String> = POSTS
        .iter()
        .flat_map(|p| p.tags.iter().map(|t| t.to_string()))
        .collect();
    tags.sort();
    tags.dedup();
    PostIndex { posts, tags }
}

pub fn find_post(slug: &str) -> Option<PostDetail> {
    let index = POSTS.iter().position(|p| p.slug == slug)?;
    let post = &POSTS[index];
    Some(PostDetail {
        summary: post.summary(),
        body: post.body.iter().map(|p| p.to_string()).collect(),
        previous: index.checked_sub(1).map(|i| POSTS[i].link()),
        next: POSTS.get(index + 1).map(StoredPost::link),
    })
}

fn seed_posts() -> Vec<StoredPost> {
    vec![
        StoredPost {
            slug: "one-crate-two-targets",
            title: "One crate, two targets",
            date: "2026-09-02",
            tags: &["architecture", "wasm"],
            body: &[
                "A Leptos app is a single Rust crate compiled twice. The `ssr` feature builds a native Axum binary that renders HTML. The `hydrate` feature builds a WebAssembly library that takes over that HTML in the browser.",
                "Code that must stay on the server lives behind `#[cfg(feature = \"ssr\")]`. The store that holds the tasks on this site is one example: it never reaches the WASM bundle.",
                "cargo-leptos runs both builds, then Tailwind, and serves the result with live reload.",
            ],
        },
        StoredPost {
            slug: "server-functions",
            title: "Server functions replace your API layer",
            date: "2026-09-16",
            tags: &["server", "architecture"],
            body: &[
                "A `#[server]` function looks like an ordinary async function. On the server, its body runs. In the browser, the macro replaces the body with an HTTP call to an endpoint that Leptos registers for you.",
                "Arguments and return values are plain Rust types with `Serialize` and `Deserialize`. If you rename a field, both sides fail to compile until you fix them.",
                "Combined with `ActionForm`, a server function also works as a plain HTML form post, so the task board on this site works before the WASM has loaded.",
            ],
        },
        StoredPost {
            slug: "fine-grained-reactivity",
            title: "Fine-grained reactivity without a virtual DOM",
            date: "2026-10-01",
            tags: &["reactivity", "performance"],
            body: &[
                "Leptos components run once. A signal read inside a closure, such as `move || count.get()`, creates a small effect that updates only that text node when the signal changes.",
                "There is no virtual DOM to diff and no component to re-render. `Memo` caches derived values, and `Resource` ties async data to the signals it depends on.",
                "On the task board, changing the filter updates a query parameter, which updates a memo, which refetches one resource.",
            ],
        },
        StoredPost {
            slug: "suspense-and-transitions",
            title: "Suspense, Transition and streaming HTML",
            date: "2026-10-20",
            tags: &["reactivity", "server"],
            body: &[
                "`<Suspense/>` shows a fallback until the resources read inside it have resolved. On the server, Leptos streams the page: the shell is sent at once and each resolved resource follows in the same response.",
                "`<Transition/>` shows the fallback only the first time. When a resource refetches, it keeps the previous content on screen, which avoids flicker when you add or complete a task.",
                "Errors from server functions are values. An `<ErrorBoundary/>` catches them and renders a fallback, as on the page for a post that does not exist.",
            ],
        },
        StoredPost {
            slug: "nested-routing",
            title: "Nested routes and layouts",
            date: "2026-11-03",
            tags: &["routing"],
            body: &[
                "A `<ParentRoute/>` renders a layout and an `<Outlet/>` where its child route goes. This blog uses one: the header stays in place while you move between the index and a post.",
                "Route parameters such as `:slug` are read with `use_params_map`, and the query string with `use_query_map`. Both are memos, so the views that use them update by themselves.",
                "The `<A/>` component sets `aria-current=\"page\"` on the active link. The navigation bar styles it with Tailwind's `aria-[current=page]:` variant.",
            ],
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_validates_input() {
        let mut store = TaskStore::seed();
        assert!(store.add("   ", Priority::Low).is_err());
        assert!(
            store
                .add(&"x".repeat(MAX_TITLE_CHARS + 1), Priority::Low)
                .is_err()
        );
        assert!(
            store.add("Deploy to fly.io", Priority::Low).is_err(),
            "duplicate"
        );
        let task = store.add("  Write tests  ", Priority::High).unwrap();
        assert_eq!(task.title, "Write tests");
    }

    #[test]
    fn toggle_delete_and_clear() {
        let mut store = TaskStore::seed();
        let total = store.len();
        assert!(store.toggle(5).unwrap().done);
        store.delete(1).unwrap();
        assert!(store.delete(1).is_err());
        assert_eq!(store.clear_done(), 2); // seeded task 2 and toggled task 5
        assert_eq!(store.len(), total - 3);
    }

    #[test]
    fn list_sorts_open_first() {
        let store = TaskStore::seed();
        let list = store.list(TaskFilter::All);
        assert_eq!(list.stats.total, 5);
        assert!(!list.tasks[0].done);
        assert!(list.tasks.last().unwrap().done);
        assert_eq!(store.list(TaskFilter::Done).tasks.len(), 2);
    }

    #[test]
    fn post_search_and_neighbours() {
        assert_eq!(search_posts("", None).posts.len(), post_count());
        assert_eq!(search_posts("OUTLET", None).posts.len(), 1);
        assert!(
            search_posts("", Some("server"))
                .posts
                .iter()
                .all(|p| p.tags.contains(&"server".to_string()))
        );
        let first = find_post("one-crate-two-targets").unwrap();
        assert!(first.previous.is_none());
        assert_eq!(first.next.unwrap().slug, "server-functions");
        assert!(find_post("missing").is_none());
    }
}
