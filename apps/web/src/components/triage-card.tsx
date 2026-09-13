import React from "react";
import type { FeedbackSentiment, IssueType, TelegramReply } from "@/lib/inbox/types";
import { TelegramReplyApproval } from "./telegram-reply-approval";

// Tool arguments arrive incrementally, before the schema settles — every field
// is optional here, same as the starter's IncidentCard.
export interface TriageCardProps {
  messageId?: string;
  type?: string;
  summary?: string;
  sentiment?: FeedbackSentiment;
  text?: string;
  reply?: TelegramReply;
}

const STYLE: Record<IssueType, { label: string; color: string; badgeBg: string }> = {
  bug: { label: "Bug", color: "#e5484d", badgeBg: "rgba(229,72,77,0.15)" },
  question: { label: "Question", color: "#7c5cfc", badgeBg: "rgba(124,92,252,0.15)" },
  feedback: { label: "Feedback", color: "#0f9d84", badgeBg: "rgba(15,157,132,0.15)" },
};

function styleFor(type?: string) {
  return type === "bug" || type === "question" || type === "feedback"
    ? STYLE[type]
    : { label: "Triaging…", color: "var(--muted)", badgeBg: "transparent" };
}

export function TriageBadge({ type }: { type?: string }) {
  const s = styleFor(type);
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: s.color,
        background: s.badgeBg,
        border: `1px solid ${s.color}`,
        borderRadius: 6,
        padding: "2px 8px",
      }}
    >
      {s.label}
    </span>
  );
}

export function FeedbackSentimentBadge({ sentiment }: { sentiment?: FeedbackSentiment }) {
  if (!sentiment) return null;
  const positive = sentiment === "positive";
  return (
    <span
      aria-label={positive ? "Positive feedback" : "Feedback needs attention"}
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: positive ? "#0f9d84" : "#b54708",
        background: positive ? "rgba(15,157,132,0.15)" : "rgba(181,71,8,0.13)",
        borderRadius: 6,
        padding: "2px 8px",
      }}
    >
      {positive ? "👍 Positive" : "👎 Needs attention"}
    </span>
  );
}

/** Generative-UI Triage Card: Issue Type + one-line summary for a Message. */
export function TriageCard({ messageId, type, summary, sentiment, text, reply }: TriageCardProps) {
  const s = styleFor(type);
  return (
    <article className="ck-card" style={{ borderLeftColor: s.color }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <TriageBadge type={type} />
        {type === "feedback" ? <FeedbackSentimentBadge sentiment={sentiment} /> : null}
        <p style={{ margin: 0, fontWeight: 600 }}>{summary || "Reading the message…"}</p>
        {text && text !== summary ? (
          <p className="ck-muted" style={{ margin: 0, fontSize: 13 }}>
            {text}
          </p>
        ) : null}
        {type === "question" && messageId && reply ? (
          <TelegramReplyApproval messageId={messageId} reply={reply} />
        ) : null}
      </div>
    </article>
  );
}
