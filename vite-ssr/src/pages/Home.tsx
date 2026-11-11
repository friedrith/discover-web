import { useState } from "react";
import {
  type ActionFunctionArgs,
  Link,
  data,
  useActionData,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from "react-router";
import { api } from "../api.ts";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Spinner } from "../components/Feedback.tsx";
import { errorMessage } from "../shared/errors.ts";
import type { Greeting, ServerInfo } from "../shared/models.ts";

type InfoResult = { ok: true; info: ServerInfo } | { ok: false; error: string };
type GreetResult =
  { ok: true; greeting: Greeting } | { ok: false; error: string };

/** Runs on the server for the first request, then in the browser. */
export async function homeLoader(): Promise<InfoResult> {
  try {
    return { ok: true, info: await api.fetchServerInfo() };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function homeAction({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  try {
    const greeting = await api.greet(String(form.get("name") ?? ""));
    return { ok: true, greeting } satisfies GreetResult;
  } catch (error) {
    return data(
      { ok: false, error: errorMessage(error) } satisfies GreetResult,
      { status: 400 },
    );
  }
}

export function HomePage() {
  return (
    <>
      <section className="flex flex-col gap-4 py-6">
        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
          TypeScript · Vite · React · Express · Tailwind
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          One language, from the database to the button.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          An Express server renders every page as HTML with Vite SSR, then a
          client bundle built from the same code takes over in the browser.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Feature
          to="/tasks"
          title="Task board"
          text="CRUD with actions and server functions, optimistic UI and filters in the URL."
        />
        <Feature
          to="/blog"
          title="Blog"
          text="Nested routes, dynamic :slug params, live search and error elements."
        />
        <Feature
          to="/about"
          title="How it works"
          text="What runs on the server, what runs in the browser, and why."
        />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Counter />
        <GreetForm />
      </div>
      <ServerInfoCard />
    </>
  );
}

function Feature({
  to,
  title,
  text,
}: {
  to: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
        {title}{" "}
        <span className="inline-block transition group-hover:translate-x-1">
          →
        </span>
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
    </Link>
  );
}

/** Runs entirely in the browser after hydration. */
function Counter() {
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const parity = count % 2 === 0 ? "even" : "odd";

  function apply(delta: number) {
    const next = count + delta;
    setCount(next);
    setHistory((h) => [...h, next].slice(-12));
  }

  const max = Math.max(1, ...history.map(Math.abs));

  return (
    <Card
      title="Client state (React)"
      description="useState in the browser. No server round trip."
    >
      <p className="text-5xl font-bold text-zinc-900 tabular-nums dark:text-zinc-50">
        {count}
      </p>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        The number is {parity}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => apply(1)}>+1</Button>
        <Button variant="outline" onClick={() => apply(-1)}>
          −1
        </Button>
        <Button variant="outline" onClick={() => apply(10)}>
          +10
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setCount(0);
            setHistory([]);
          }}
        >
          Reset
        </Button>
      </div>
      <div
        className="mt-4 flex h-12 items-end gap-1"
        aria-label="Recent values"
      >
        {history.map((v, i) => (
          <div
            key={i}
            className={`w-3 rounded-sm transition-all ${v < 0 ? "bg-red-400" : "bg-zinc-800 dark:bg-zinc-200"}`}
            style={{ height: `${8 + Math.floor((Math.abs(v) * 40) / max)}px` }}
            title={String(v)}
          />
        ))}
      </div>
    </Card>
  );
}

/** Calls the `greet` server function through the home route's action. */
function GreetForm() {
  const fetcher = useFetcher<typeof homeAction>();
  // With JavaScript off, the form does a full page post and the result comes back as action data.
  const actionData = useActionData<typeof homeAction>();
  const result = fetcher.data ?? actionData;
  const pending = fetcher.state !== "idle";

  return (
    <Card
      title="Server function (Node)"
      description="Works as a plain HTML form before the JS loads."
    >
      <fetcher.Form method="post" action="/?index" className="flex gap-2">
        <input
          type="text"
          name="name"
          placeholder="Your name"
          autoComplete="off"
          aria-label="Your name"
          className="input min-w-0 flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Greet"}
        </Button>
      </fetcher.Form>
      <p className="mt-4 text-sm" aria-live="polite">
        {!result ? (
          <span className="text-zinc-500 dark:text-zinc-400">
            No request yet.
          </span>
        ) : result.ok ? (
          <span className="text-emerald-700 dark:text-emerald-400">
            {result.greeting.message} ({result.greeting.nameLength} characters)
          </span>
        ) : (
          <span className="text-red-600 dark:text-red-400">{result.error}</span>
        )}
      </p>
    </Card>
  );
}

/** Loaded with the page during SSR, then reloaded on demand from the browser. */
function ServerInfoCard() {
  const result = useLoaderData<typeof homeLoader>();
  const revalidator = useRevalidator();

  return (
    <Card
      title="Live server stats"
      description="Fetched by a server function. The first load is part of the server-rendered HTML."
    >
      {result.ok ? (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Uptime" value={formatUptime(result.info.uptimeSecs)} />
          <Stat label="Server calls" value={String(result.info.serverCalls)} />
          <Stat label="Tasks stored" value={String(result.info.taskCount)} />
          <Stat
            label="Platform"
            value={`${result.info.os} / ${result.info.arch}`}
          />
        </dl>
      ) : (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="outline"
          size="small"
          onClick={() => revalidator.revalidate()}
        >
          Refresh
        </Button>
        {revalidator.state === "loading" && <Spinner />}
        {result.ok && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {result.info.runtime}
          </span>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
        {value}
      </dd>
    </div>
  );
}

function formatUptime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3_600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3_600)}h ${Math.floor((secs % 3_600) / 60)}m`;
}
