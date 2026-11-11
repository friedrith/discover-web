//! Types shared by the Axum server and the WASM client.
//!
//! Each type is defined once. Server functions serialize them on the server and
//! deserialize them in the browser, so both sides always agree on the shape.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Priority {
    Low,
    #[default]
    Medium,
    High,
}

impl Priority {
    pub const ALL: [Priority; 3] = [Priority::Low, Priority::Medium, Priority::High];

    pub fn label(self) -> &'static str {
        match self {
            Priority::Low => "Low",
            Priority::Medium => "Medium",
            Priority::High => "High",
        }
    }

    /// Value used in HTML forms (`<select name="priority">`).
    pub fn value(self) -> &'static str {
        match self {
            Priority::Low => "low",
            Priority::Medium => "medium",
            Priority::High => "high",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|p| p.value() == value)
    }

    /// Higher first when sorting.
    pub fn rank(self) -> u8 {
        match self {
            Priority::High => 0,
            Priority::Medium => 1,
            Priority::Low => 2,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Task {
    pub id: u32,
    pub title: String,
    pub priority: Priority,
    pub done: bool,
    /// Unix time, in seconds.
    pub created_at: u64,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaskFilter {
    #[default]
    All,
    Active,
    Done,
}

impl TaskFilter {
    pub const ALL: [TaskFilter; 3] = [TaskFilter::All, TaskFilter::Active, TaskFilter::Done];

    /// Reads the `?filter=` query parameter. Unknown values fall back to `All`.
    pub fn from_query(value: Option<&str>) -> Self {
        match value {
            Some("active") => TaskFilter::Active,
            Some("done") => TaskFilter::Done,
            _ => TaskFilter::All,
        }
    }

    pub fn query(self) -> &'static str {
        match self {
            TaskFilter::All => "all",
            TaskFilter::Active => "active",
            TaskFilter::Done => "done",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            TaskFilter::All => "All",
            TaskFilter::Active => "Active",
            TaskFilter::Done => "Done",
        }
    }

    pub fn matches(self, task: &Task) -> bool {
        match self {
            TaskFilter::All => true,
            TaskFilter::Active => !task.done,
            TaskFilter::Done => task.done,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskStats {
    pub total: usize,
    pub active: usize,
    pub done: usize,
}

impl TaskStats {
    pub fn percent_done(self) -> usize {
        (self.done * 100).checked_div(self.total).unwrap_or(0)
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TaskList {
    pub tasks: Vec<Task>,
    pub stats: TaskStats,
    /// Server time when the list was built. Relative dates ("5 min ago") are
    /// computed from it, so the server HTML and the hydrated client match.
    pub now: u64,
}

/// "just now", "5 min ago", "3 h ago", "2 d ago".
pub fn relative_time(then: u64, now: u64) -> String {
    let secs = now.saturating_sub(then);
    match secs {
        0..60 => "just now".to_string(),
        60..3_600 => format!("{} min ago", secs / 60),
        3_600..86_400 => format!("{} h ago", secs / 3_600),
        _ => format!("{} d ago", secs / 86_400),
    }
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PostSummary {
    pub slug: String,
    pub title: String,
    pub excerpt: String,
    pub date: String,
    pub tags: Vec<String>,
    pub reading_minutes: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PostLink {
    pub slug: String,
    pub title: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PostDetail {
    pub summary: PostSummary,
    pub body: Vec<String>,
    pub previous: Option<PostLink>,
    pub next: Option<PostLink>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PostIndex {
    pub posts: Vec<PostSummary>,
    /// Every tag across all posts, for the filter chips.
    pub tags: Vec<String>,
}

// ---------------------------------------------------------------------------
// Server info
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ServerInfo {
    pub uptime_secs: u64,
    pub server_calls: u64,
    pub os: String,
    pub arch: String,
    pub task_count: usize,
    pub post_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn relative_time_buckets() {
        assert_eq!(relative_time(100, 100), "just now");
        assert_eq!(relative_time(0, 120), "2 min ago");
        assert_eq!(relative_time(0, 7_200), "2 h ago");
        assert_eq!(relative_time(0, 172_800), "2 d ago");
        // Clock skew never panics.
        assert_eq!(relative_time(200, 100), "just now");
    }

    #[test]
    fn filter_from_query() {
        assert_eq!(TaskFilter::from_query(Some("done")), TaskFilter::Done);
        assert_eq!(TaskFilter::from_query(Some("nope")), TaskFilter::All);
        assert_eq!(TaskFilter::from_query(None), TaskFilter::All);
    }

    #[test]
    fn priority_round_trip() {
        for p in Priority::ALL {
            assert_eq!(Priority::parse(p.value()), Some(p));
        }
        assert_eq!(Priority::parse("urgent"), None);
    }
}
