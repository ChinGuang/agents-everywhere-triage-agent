"use client";

import { useState } from "react";
import type { TelegramReply } from "@/lib/inbox/types";

type ReplyState = TelegramReply["status"] | "declined";

export function TelegramReplyApproval({ messageId, reply }: { messageId: string; reply: TelegramReply }) {
  const [text, setText] = useState(reply.text);
  const [state, setState] = useState<ReplyState>(reply.status);
  const [notice, setNotice] = useState(reply.error ?? "");

  const send = async () => {
    setState("sending");
    setNotice("");
    try {
      const res = await fetch("/api/messages/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: messageId, text }),
      });
      const data = (await res.json()) as { telegramMessageId?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Telegram could not send the reply");
      setState("sent");
      setNotice(`Sent to Telegram (message ${data.telegramMessageId ?? "confirmed"}).`);
    } catch (error) {
      setState("failed");
      setNotice(error instanceof Error ? error.message : "Telegram could not send the reply");
    }
  };

  if (state === "declined") {
    return <p className="ck-muted" style={{ margin: 0 }}>Reply draft declined — nothing was sent.</p>;
  }

  return (
    <section className="ck-approval" aria-label="Telegram reply approval">
      <h3>Proposed Telegram reply</h3>
      <label className="ck-sr-only" htmlFor={`reply-${messageId}`}>Draft reply</label>
      <textarea
        id={`reply-${messageId}`}
        className="ck-reply-draft"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={state === "sending" || state === "sent"}
        maxLength={4096}
      />
      <div className="ck-approval-actions">
        <button
          type="button"
          className="ck-btn ck-btn--primary"
          onClick={() => void send()}
          disabled={!text.trim() || state === "sending" || state === "sent"}
        >
          {state === "sending" ? "Sending…" : state === "sent" ? "Sent" : "Send Telegram reply"}
        </button>
        <button
          type="button"
          className="ck-btn"
          onClick={() => setState("declined")}
          disabled={state === "sending" || state === "sent"}
        >
          Decline
        </button>
      </div>
      {notice ? <p className={state === "failed" ? "ck-error" : "ck-muted"}>{notice}</p> : null}
    </section>
  );
}
