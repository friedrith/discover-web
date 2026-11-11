use leptos::prelude::*;
use leptos_meta::{Meta, Title};
use leptos_router::components::{A, Form, Outlet};
use leptos_router::hooks::{use_params_map, use_query_map};

use crate::api::{error_message, get_post, list_posts};
use crate::components::{Badge, ErrorNotice, Skeleton, Spinner};
use crate::models::{PostDetail, PostLink, PostSummary};

/// Parent route for `/blog` and `/blog/:slug`: the header stays, the `<Outlet/>` changes.
#[component]
pub fn BlogLayout() -> impl IntoView {
    view! {
        <header class="flex flex-col gap-1 border-b border-zinc-200 pb-6 dark:border-zinc-800">
            <A
                href="/blog"
                attr:class="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
            >
                "Blog"
            </A>
            <p class="text-zinc-600 dark:text-zinc-400">
                "Short notes on how this site is built. The posts come from a server function."
            </p>
        </header>
        <Outlet />
    }
}

#[component]
pub fn PostList() -> impl IntoView {
    let query = use_query_map();
    let search = Memo::new(move |_| query.read().get("q").unwrap_or_default());
    let tag = Memo::new(move |_| query.read().get("tag").filter(|t| !t.is_empty()));

    let posts = Resource::new(
        move || (search.get(), tag.get()),
        |(search, tag)| list_posts(search, tag),
    );
    // The search the results on screen belong to. Different from the URL while loading.
    let shown = RwSignal::new((search.get_untracked(), tag.get_untracked()));

    view! {
        <Title text="Blog" />
        // A GET form handled by the router: submitting it only changes the query string.
        <Form method="GET" action="" replace=true attr:class="flex items-center gap-3" attr:role="search">
            <label class="sr-only" for="post-search">
                "Search posts"
            </label>
            <input
                id="post-search"
                type="search"
                name="q"
                placeholder="Search posts…"
                class="input flex-1"
                prop:value=move || search.get()
                // Submits on every keystroke; the router keeps it a client-side navigation.
                oninput="this.form.requestSubmit()"
            />
            {move || tag.get().map(|tag| view! { <input type="hidden" name="tag" value=tag /> })}
            <Show when=move || shown.get() != (search.get(), tag.get())>
                <Spinner />
            </Show>
        </Form>

        <Transition fallback=|| view! { <Skeleton lines=6 /> }>
            {move || Suspend::new(async move {
                let result = posts.await;
                shown.set((search.get_untracked(), tag.get_untracked()));
                match result {
                    Ok(index) => {
                        let active_tag = tag.get_untracked();
                        view! {
                            <TagFilter tags=index.tags active=active_tag />
                            <PostCards posts=index.posts />
                        }
                            .into_any()
                    }
                    Err(err) => {
                        view! { <ErrorNotice message=error_message(&err)>""</ErrorNotice> }
                            .into_any()
                    }
                }
            })}
        </Transition>
    }
}

#[component]
fn TagFilter(tags: Vec<String>, active: Option<String>) -> impl IntoView {
    let chip = |href: String, label: String, selected: bool| {
        let class = if selected {
            "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        } else {
            "rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        };
        view! {
            <A href=href scroll=false attr:class=class>
                {label}
            </A>
        }
    };
    view! {
        <nav class="flex flex-wrap gap-2" aria-label="Filter by tag">
            {chip("/blog".into(), "All".into(), active.is_none())}
            {tags
                .into_iter()
                .map(|tag| {
                    let selected = active.as_deref() == Some(tag.as_str());
                    chip(format!("/blog?tag={tag}"), format!("#{tag}"), selected)
                })
                .collect_view()}
        </nav>
    }
}

#[component]
fn PostCards(posts: Vec<PostSummary>) -> impl IntoView {
    if posts.is_empty() {
        return view! {
            <p class="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                "No post matches this search."
            </p>
        }
        .into_any();
    }
    view! {
        <ul class="grid gap-4">
            {posts
                .into_iter()
                .map(|post| {
                    view! {
                        <li>
                            <A
                                href=format!("/blog/{}", post.slug)
                                attr:class="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                            >
                                <PostMeta post=post.clone() />
                                <h2 class="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                                    {post.title}
                                </h2>
                                <p class="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    {render_inline_code(&post.excerpt)}
                                </p>
                            </A>
                        </li>
                    }
                })
                .collect_view()}
        </ul>
    }
    .into_any()
}

#[component]
fn PostMeta(post: PostSummary) -> impl IntoView {
    let date = post.date.clone();
    view! {
        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <time datetime=date>{post.date}</time>
            <span aria-hidden="true">"·"</span>
            <span>{post.reading_minutes} " min read"</span>
            {post.tags.into_iter().map(|t| view! { <Badge>{t}</Badge> }).collect_view()}
        </div>
    }
}

#[component]
pub fn PostPage() -> impl IntoView {
    let params = use_params_map();
    let slug = Memo::new(move |_| params.read().get("slug").unwrap_or_default());
    let post = Resource::new(move || slug.get(), get_post);

    view! {
        // Suspense (not Transition): moving to another post shows the skeleton again.
        <Suspense fallback=|| view! { <Skeleton lines=8 /> }>
            {move || Suspend::new(async move {
                match post.await {
                    Ok(post) => view! { <Article post /> }.into_any(),
                    Err(err) => {
                        view! {
                            <Title text="Post not found" />
                            <ErrorNotice message=error_message(&err)>
                                <A href="/blog" attr:class="underline">
                                    "Back to all posts"
                                </A>
                            </ErrorNotice>
                        }
                            .into_any()
                    }
                }
            })}
        </Suspense>
    }
}

#[component]
fn Article(post: PostDetail) -> impl IntoView {
    let PostDetail {
        summary,
        body,
        previous,
        next,
    } = post;
    view! {
        <Title text=summary.title.clone() />
        <Meta name="description" content=summary.excerpt.clone() />
        <article class="flex flex-col gap-4">
            <PostMeta post=summary.clone() />
            <h1 class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {summary.title}
            </h1>
            {body
                .into_iter()
                .map(|paragraph| {
                    view! {
                        <p class="leading-7 text-zinc-700 dark:text-zinc-300">
                            {render_inline_code(&paragraph)}
                        </p>
                    }
                })
                .collect_view()}
        </article>
        <nav
            class="grid gap-4 border-t border-zinc-200 pt-6 sm:grid-cols-2 dark:border-zinc-800"
            aria-label="More posts"
        >
            <div>{previous.map(|link| view! { <Neighbour link label="← Previous" /> })}</div>
            <div class="sm:text-right">
                {next.map(|link| view! { <Neighbour link label="Next →" /> })}
            </div>
        </nav>
    }
}

#[component]
fn Neighbour(link: PostLink, label: &'static str) -> impl IntoView {
    view! {
        <A href=format!("/blog/{}", link.slug) attr:class="group block">
            <span class="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
            <span class="block font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
                {link.title}
            </span>
        </A>
    }
}

/// Turns `code` spans into `<code>` elements. Everything else stays text, so
/// nothing from the post is ever parsed as HTML.
fn render_inline_code(text: &str) -> impl IntoView + use<> {
    text.split('`')
        .enumerate()
        .map(|(i, part)| {
            let part = part.to_string();
            if i % 2 == 1 {
                view! {
                    <code class="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                        {part}
                    </code>
                }
                    .into_any()
            } else {
                part.into_any()
            }
        })
        .collect_view()
}
