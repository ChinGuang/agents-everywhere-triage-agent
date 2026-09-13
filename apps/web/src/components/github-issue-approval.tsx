"use client";

import { useState } from "react";

type Props = {
  args: { title?: string; body?: string };
  /** A function only while the tool call is executing; falsy once resolved. */
  respond?: (message: string) => void;
  result?: unknown;
};

type State =
  | { status: "idle" }
  | { status: "creating" }
  | { status: "done"; url: string; number: number }
  | { status: "error"; message: string };

/**
 * Human-in-the-loop approval for creating a GitHub issue from a triaged bug.
 * Nothing is created until the user clicks Approve — the side effect lives in
 * the click handler, and `respond` tells the agent what happened.
 */
export function GithubIssueApproval({ args, respond, result }: Props) {
  const [state, setState] = useState<State>({ status: "idle" });

  // Resolved already (respond is gone): show the outcome.
  if (!respond) {
    return (
      <article className="ck-card">
        <p>
          {state.status === "done" ? (
            <a href={state.url} target="_blank" rel="noreferrer">
              Issue #{state.number} created ↗
            </a>
          ) : (
            (result != null ? String(result) : "Done.")
          )}
        </p>
      </article>
    );
  }

  async function approve() {
    setState({ status: "creating" });
    try {
      const res = await fetch("/api/github/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: args.title, body: args.body }),
      });
      const data = (await res.json()) as { number?: number; url?: string; error?: string };
      if (!res.ok || typeof data.url !== "string" || typeof data.number !== "number") {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setState({ status: "done", url: data.url, number: data.number });
      respond?.(`Created GitHub issue #${data.number}: ${data.url}. Tell the user it's filed and share the link.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed";
      setState({ status: "error", message });
      respond?.(`Creating the GitHub issue failed: ${message}. Tell the user plainly; nothing was filed.`);
    }
  }

  return (
    <article className="ck-card ck-card--gate">
      <h3>Create GitHub issue?</h3>
      <p style={{ fontWeight: 600, margin: "4px 0" }}>{args.title || "…"}</p>
      {args.body ? (
        <pre className="ck-preserve-lines" style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: "4px 0" }}>
          {args.body}
        </pre>
      ) : null}
      {state.status === "error" ? <p className="ck-error">{state.message}</p> : null}
      <div className="ck-actions">
        <button
          type="button"
          className="ck-btn ck-btn--primary"
          disabled={state.status === "creating"}
          onClick={() => void approve()}
        >
          {state.status === "creating" ? "Creating…" : "Approve & create"}
        </button>
        <button
          type="button"
          className="ck-btn"
          onClick={() => respond?.("The user declined. Do not create the issue and do not offer a workaround.")}
        >
          Cancel
        </button>
      </div>
    </article>
  );
}
