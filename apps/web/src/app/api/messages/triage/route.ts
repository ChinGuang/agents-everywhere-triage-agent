import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStore } from "@/lib/server/inbox-ingest";
import { isFeedbackSentiment, isIssueType } from "@/lib/inbox/types";
import { detectFeedbackSentiment } from "@/lib/inbox/sentiment";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { id?: unknown; type?: unknown; summary?: unknown; draftReply?: unknown; sentiment?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { id, type, summary } = body;
  const draftReply = typeof body.draftReply === "string" ? body.draftReply.trim() : undefined;
  const sentiment = body.sentiment;
  if (typeof id !== "string" || !isIssueType(type) || typeof summary !== "string" || summary.trim() === "") {
    return NextResponse.json(
      { error: "expected { id: string, type: feedback|bug|question, summary: non-empty string }" },
      { status: 400 },
    );
  }
  if (draftReply !== undefined && (draftReply === "" || draftReply.length > 4096)) {
    return NextResponse.json({ error: "draftReply must be 1-4096 characters when provided" }, { status: 400 });
  }
  if (type !== "question" && draftReply !== undefined) {
    return NextResponse.json({ error: "only question triage cards can include a draftReply" }, { status: 400 });
  }
  if (sentiment !== undefined && !isFeedbackSentiment(sentiment)) {
    return NextResponse.json({ error: "sentiment must be positive or negative when provided" }, { status: 400 });
  }
  if (type !== "feedback" && sentiment !== undefined) {
    return NextResponse.json({ error: "only feedback triage cards can include sentiment" }, { status: 400 });
  }

  const store = getStore();
  const existing = store.get(id);
  const resolvedSentiment =
    type === "feedback" ? (sentiment ?? detectFeedbackSentiment(existing?.text ?? summary)) : undefined;
  const ok = store.setTriage(id, {
    type,
    summary: summary.trim(),
    ...(resolvedSentiment ? { sentiment: resolvedSentiment } : {}),
    ...(type === "question" && draftReply ? { reply: { text: draftReply, status: "draft" } } : {}),
  });
  if (!ok) return NextResponse.json({ error: `no message with id ${id}` }, { status: 404 });
  return NextResponse.json({ ok: true });
}
