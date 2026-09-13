import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStore } from "@/lib/server/inbox-ingest";
import { isIssueType } from "@/lib/inbox/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { id?: unknown; type?: unknown; summary?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { id, type, summary } = body;
  if (typeof id !== "string" || !isIssueType(type) || typeof summary !== "string" || summary.trim() === "") {
    return NextResponse.json(
      { error: "expected { id: string, type: feedback|bug|question, summary: non-empty string }" },
      { status: 400 },
    );
  }

  const ok = getStore().setTriage(id, { type, summary });
  if (!ok) return NextResponse.json({ error: `no message with id ${id}` }, { status: 404 });
  return NextResponse.json({ ok: true });
}
