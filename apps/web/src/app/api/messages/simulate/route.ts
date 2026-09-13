import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStore } from "@/lib/server/inbox-ingest";
import type { InboundMessage } from "@/lib/telegram";

const SAMPLES = [
  "The checkout page throws a 500 error every time I try to pay.",
  "How do I change the email address on my account?",
  "Honestly the new dashboard is fantastic — great job team!",
  "Export to CSV is broken, the button does nothing.",
  "Could you add a dark mode? The white background is rough at night.",
  "Where can I find my past invoices?",
];

const globals = globalThis as unknown as { __simCount?: number };

export async function POST(req: NextRequest): Promise<NextResponse> {
  let text: string | undefined;
  try {
    const body = (await req.json()) as { text?: unknown };
    if (typeof body.text === "string" && body.text.trim()) text = body.text.trim();
  } catch {
    // no/invalid body — fall through to a rotating sample
  }

  const n = (globals.__simCount = (globals.__simCount ?? 0) + 1);
  if (!text) text = SAMPLES[n % SAMPLES.length]!;

  const messageId = Date.now() * 1000 + (n % 1000);
  const message: InboundMessage = {
    updateId: messageId,
    messageId,
    chatId: 1,
    fromName: "Demo Customer",
    text,
    date: Math.floor(Date.now() / 1000),
  };

  getStore().add(message);
  return NextResponse.json({ ok: true, id: `1:${messageId}` });
}
