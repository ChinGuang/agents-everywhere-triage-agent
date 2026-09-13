"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgentContext, useFrontendTool, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { TriageCard } from "./triage-card";
import { GithubIssueApproval } from "./github-issue-approval";
import { classifyMessage } from "@/lib/inbox/classify";
import type { StoredMessage } from "@/lib/inbox/types";

async function postJson(url: string, body: unknown): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function Inbox() {
  const [messages, setMessages] = useState<StoredMessage[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      const data = (await res.json()) as { messages: StoredMessage[] };
      setMessages(data.messages);
    } catch {
      // transient during dev restarts — the next poll recovers
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 2000);
    return () => clearInterval(timer);
  }, [refresh]);

  const untriaged = useMemo(() => messages.filter((m) => !m.triage), [messages]);

  // Expose the untriaged messages to the agent as page context.
  useAgentContext({
    description:
      "The COMPLETE list of untriaged inbound customer messages in the support inbox. " +
      "This is the ONLY source of messages — triage exactly these and no others. " +
      "Never invent, assume, or add messages that are not in this list. Call " +
      "triage_message once per message here, passing its exact `id` verbatim. " +
      "If the list is empty, tell the user the inbox has nothing to triage.",
    value: { untriagedMessages: untriaged.map((m) => ({ id: m.id, from: m.fromName, text: m.text })) },
  });

  // The triage tool: the agent classifies a message and calls this. `render`
  // draws the Triage Card in the chat (generative UI); `handler` persists it.
  useFrontendTool(
    {
      name: "triage_message",
      description:
        "Triage ONE real inbound message from the untriagedMessages context into " +
        "exactly one issue type and a one-line summary. Only call this with an id " +
        "that appears in untriagedMessages — never invent a message or an id.",
      parameters: z.object({
        messageId: z
          .string()
          .describe("The exact `id` of a message from untriagedMessages, copied verbatim (e.g. \"1:1789...\")."),
        type: z.enum(["feedback", "bug", "question"]),
        summary: z.string().describe("A one-line summary of that message."),
        draftReply: z
          .string()
          .optional()
          .describe(
            "For a question only: a concise, helpful answer to propose to the customer. This stays a draft until a human approves Send.",
          ),
        sentiment: z
          .enum(["positive", "negative"])
          .optional()
          .describe(
            "For feedback only: positive for clear praise or satisfaction; negative for a complaint or request needing attention.",
          ),
      }),
      handler: async ({ messageId, type, summary, draftReply, sentiment }) => {
        await postJson("/api/messages/triage", { id: messageId, type, summary, draftReply, sentiment });
        await refresh();
        return `Triaged ${messageId} as ${type}.`;
      },
      render: ({ args }: { args: { messageId?: string; type?: string; summary?: string; draftReply?: string; sentiment?: "positive" | "negative" } }) => (
        <TriageCard
          messageId={args.messageId}
          type={args.type}
          summary={args.summary}
          sentiment={args.sentiment}
          reply={args.draftReply ? { text: args.draftReply, status: "draft" } : undefined}
        />
      ),
    },
    [refresh],
  );

  // Bug → GitHub issue, gated behind a human approval (creating an issue is an
  // outward, side-effecting action). The agent proposes a title + body; the
  // issue is only created when the support agent clicks Approve.
  useHumanInTheLoop({
    name: "create_github_issue",
    description:
      "Propose creating a GitHub issue for a message triaged as a BUG. Only call this for bugs. " +
      "Draft a concise title and a body containing the customer's message. The issue is NOT created " +
      "until the user approves — do not claim it was filed until this tool returns a created link.",
    parameters: z.object({
      title: z.string().describe("A concise issue title — the bug in a few words."),
      body: z.string().describe("The issue body: the customer's message and any useful context, as Markdown."),
    }),
    render: ({ args, respond, result }) => (
      <GithubIssueApproval args={args} respond={respond} result={result} />
    ),
  });

  const triageOffline = useCallback(async () => {
    await Promise.all(
      untriaged.map((m) => {
        const { type, summary } = classifyMessage(m.text);
        return postJson("/api/messages/triage", { id: m.id, type, summary });
      }),
    );
    await refresh();
  }, [untriaged, refresh]);

  const triagedCount = messages.length - untriaged.length;

  return (
    <section className="ck-panel">
      <header className="ck-workspace-header" style={{ marginBottom: 16 }}>
        <div>
          <p className="ck-eyebrow">Support inbox</p>
          <h2 style={{ margin: "4px 0" }}>Triage inbox</h2>
          <p className="ck-intro" style={{ margin: 0 }}>
            Ask the assistant to “triage the new messages”, or triage offline with no AI.
          </p>
        </div>
        <span className="ck-tag">
          {messages.length} msg · {triagedCount} triaged
        </span>
      </header>

      <div className="ck-actions" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="ck-btn ck-btn--primary"
          onClick={() => void postJson("/api/messages/simulate", {}).then(refresh)}
        >
          + Simulate inbound
        </button>
        <button
          type="button"
          className="ck-btn"
          onClick={() => void triageOffline()}
          disabled={untriaged.length === 0}
        >
          Triage offline (no AI)
        </button>
      </div>

      {messages.length === 0 ? (
        <p className="ck-empty">
          Inbox is empty. Message the Telegram bot, or click “Simulate inbound”.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m) => (
            <li key={m.id} className="ck-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <strong style={{ fontSize: 13 }}>{m.fromName}</strong>
                <span className="ck-record-id" style={{ fontSize: 11 }}>{m.id}</span>
              </div>
              <p style={{ margin: "6px 0 8px" }}>{m.text}</p>
              {m.triage ? (
                <TriageCard
                  messageId={m.id}
                  type={m.triage.type}
                  summary={m.triage.summary}
                  sentiment={m.triage.sentiment}
                  text={m.text}
                  reply={m.triage.reply}
                />
              ) : (
                <span className="ck-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  untriaged
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
