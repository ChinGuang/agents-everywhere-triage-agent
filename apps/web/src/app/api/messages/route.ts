import { NextResponse } from "next/server";
import { ensureIngest, getStore } from "@/lib/server/inbox-ingest";

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  ensureIngest();
  return NextResponse.json({ messages: getStore().list() });
}
