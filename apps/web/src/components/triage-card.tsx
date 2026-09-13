import React from "react";
import type { IssueType } from "@/lib/inbox/types";

// Tool arguments arrive incrementally, before the schema settles — every field
// is optional here, same as the starter's IncidentCard.
export interface TriageCardProps {
  type?: string;
  summary?: string;
  text?: string;
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

/** Generative-UI Triage Card: Issue Type + one-line summary for a Message. */
export function TriageCard({ type, summary, text }: TriageCardProps) {
  const s = styleFor(type);
  return (
    <article className="ck-card" style={{ borderLeftColor: s.color }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <TriageBadge type={type} />
        <p style={{ margin: 0, fontWeight: 600 }}>{summary || "Reading the message…"}</p>
        {text && text !== summary ? (
          <p className="ck-muted" style={{ margin: 0, fontSize: 13 }}>
            {text}
          </p>
        ) : null}
      </div>
    </article>
  );
}
