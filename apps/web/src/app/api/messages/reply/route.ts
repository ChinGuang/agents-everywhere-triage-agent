import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStore } from "@/lib/server/inbox-ingest";
import { sendTelegramReply } from "@/lib/server/telegram-replies";
import { TelegramClient } from "@/lib/telegram";

const MAX_TELEGRAM_TEXT_LENGTH = 4096;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { id?: unknown; text?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!id || !text || text.length > MAX_TELEGRAM_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `expected { id: string, text: 1-${MAX_TELEGRAM_TEXT_LENGTH} characters }` },
      { status: 400 },
    );
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Telegram replies are not configured. Set TELEGRAM_BOT_TOKEN and try again." },
      { status: 503 },
    );
  }

  const result = await sendTelegramReply({
    store: getStore(),
    sender: new TelegramClient(token),
    messageId: id,
    text,
  });

  if (result.status === "sent") return NextResponse.json(result, { status: 201 });
  if (result.status === "missing") return NextResponse.json({ error: "message not found" }, { status: 404 });
  if (result.status === "not-question") {
    return NextResponse.json({ error: "only question triage cards can send Telegram replies" }, { status: 409 });
  }
  if (result.status === "already-sent" || result.status === "in-progress") {
    return NextResponse.json({ error: `reply ${result.status.replace("-", " ")}` }, { status: 409 });
  }
  return NextResponse.json({ error: result.error ?? "Telegram could not send the reply" }, { status: 502 });
}
