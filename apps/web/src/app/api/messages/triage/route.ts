import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStore } from "@/lib/server/inbox-ingest";
import { isIssueType } from "@/lib/inbox/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { id?: unknown; type?: unknown; summary?: unknown; draftReply?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { id, type, summary } = body;
  const draftReply = typeof body.draftReply === "string" ? body.draftReply.trim() : undefined;
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

  const ok = getStore().setTriage(id, {
    type,
    summary: summary.trim(),
    ...(type === "question" && draftReply ? { reply: { text: draftReply, status: "draft" } } : {}),
  });
  if (!ok) return NextResponse.json({ error: `no message with id ${id}` }, { status: 404 });
  return NextResponse.json({ ok: true });
}
