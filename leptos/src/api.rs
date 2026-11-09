//! Server functions. Each body runs only on the Axum server; in the browser the
//! `#[server]` macro turns the call into an HTTP request to a generated endpoint.

use leptos::prelude::*;
use serde::{Deserialize, Serialize};

use crate::models::{PostDetail, PostIndex, ServerInfo, Task, TaskFilter, TaskList};

/// Message to show to the user for a failed server function.
pub fn error_message(err: &ServerFnError) -> String {
    match err {
        ServerFnError::ServerError(message) => message.clone(),
        other => other.to_string(),
    }
}

// ---------------------------------------------------------------------------
// Greeting (home page)
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Greeting {
    pub message: String,
    pub name_length: usize,
}

#[server]
pub async fn greet(name: String) -> Result<Greeting, ServerFnError> {
    crate::store::server_call().await;
    let name = name.trim();
    if name.is_empty() {
        return Err(ServerFnError::new("Please type a name"));
    }
    Ok(Greeting {
        message: format!("Hello {name}, this was computed by the Rust server"),
        name_length: name.chars().count(),
    })
}

#[server]
pub async fn fetch_server_info() -> Result<ServerInfo, ServerFnError> {
    use crate::store;
    store::server_call().await;
    Ok(ServerInfo {
        uptime_secs: store::STARTED.elapsed().as_secs(),
        server_calls: store::server_calls(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        task_count: store::tasks().len(),
        post_count: store::post_count(),
    })
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/// No artificial delay here: it refetches after every change, and the
/// optimistic UI on the task board covers the time the mutations take.
#[server]
pub async fn list_tasks(filter: TaskFilter) -> Result<TaskList, ServerFnError> {
    Ok(crate::store::tasks().list(filter))
}

/// Called by an `ActionForm`: the arguments are the form field names.
#[server]
pub async fn add_task(title: String, priority: String) -> Result<Task, ServerFnError> {
    use crate::models::Priority;
    crate::store::server_call().await;
    let priority =
        Priority::parse(&priority).ok_or_else(|| ServerFnError::new("Unknown priority"))?;
    crate::store::tasks()
        .add(&title, priority)
        .map_err(ServerFnError::new)
}

#[server]
pub async fn toggle_task(id: u32) -> Result<Task, ServerFnError> {
    crate::store::server_call().await;
    crate::store::tasks().toggle(id).map_err(ServerFnError::new)
}

/// Returns the id of the deleted task, so the UI can hide it before the list refetches.
#[server]
pub async fn delete_task(id: u32) -> Result<u32, ServerFnError> {
    crate::store::server_call().await;
    crate::store::tasks()
        .delete(id)
        .map_err(ServerFnError::new)?;
    Ok(id)
}

#[server]
pub async fn clear_completed() -> Result<usize, ServerFnError> {
    crate::store::server_call().await;
    Ok(crate::store::tasks().clear_done())
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

#[server]
pub async fn list_posts(query: String, tag: Option<String>) -> Result<PostIndex, ServerFnError> {
    crate::store::server_call().await;
    Ok(crate::store::search_posts(&query, tag.as_deref()))
}

#[server]
pub async fn get_post(slug: String) -> Result<PostDetail, ServerFnError> {
    crate::store::server_call().await;
    crate::store::find_post(&slug).ok_or_else(|| ServerFnError::new("This post does not exist"))
}
