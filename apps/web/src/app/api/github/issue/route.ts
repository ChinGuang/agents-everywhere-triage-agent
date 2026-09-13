import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createGithubIssue } from "@/lib/github/issue";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return NextResponse.json(
      { error: "GitHub is not configured. Set GITHUB_TOKEN and GITHUB_REPO (owner/name) in .env." },
      { status: 501 },
    );
  }

  let body: { title?: unknown; body?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { title, body: issueBody } = body;
  if (typeof title !== "string" || title.trim() === "" || typeof issueBody !== "string") {
    return NextResponse.json({ error: "expected { title: non-empty string, body: string }" }, { status: 400 });
  }

  try {
    const issue = await createGithubIssue({ repo, token }, { title: title.trim(), body: issueBody });
    return NextResponse.json({ ok: true, ...issue });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to create issue" },
      { status: 502 },
    );
  }
}
