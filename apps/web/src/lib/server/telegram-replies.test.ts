import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MessageStore } from "../inbox/store";
import type { InboundMessage } from "../telegram";
import { sendTelegramReply } from "./telegram-replies";

const message = (over: Partial<InboundMessage> = {}): InboundMessage => ({
  updateId: 7,
  messageId: 8,
  chatId: 99,
  fromName: "Ada",
  text: "Where are my invoices?",
  date: 1710000000,
  ...over,
});

function questionStore(): MessageStore {
  const store = new MessageStore();
  store.add(message());
  store.setTriage("99:8", { type: "question", summary: "Customer needs invoices" });
  return store;
}

describe("sendTelegramReply", () => {
  it("sends an approved answer to the originating chat and records Telegram's message ID", async () => {
    const store = questionStore();
    const sent: Array<[number, string]> = [];

    const result = await sendTelegramReply({
      store,
      sender: { sendMessage: async (chatId, text) => { sent.push([chatId, text]); return { message_id: 123 }; } },
      messageId: "99:8",
      text: "You can find invoices under Billing.",
      now: () => 1710000001,
    });

    assert.deepEqual(result, { status: "sent", telegramMessageId: 123 });
    assert.deepEqual(sent, [[99, "You can find invoices under Billing."]]);
    assert.deepEqual(store.get("99:8")?.triage?.reply, {
      text: "You can find invoices under Billing.",
      status: "sent",
      telegramMessageId: 123,
      sentAt: 1710000001,
    });
  });

  it("refuses to send a reply for anything other than a triaged question", async () => {
    const store = new MessageStore();
    store.add(message());
    store.setTriage("99:8", { type: "bug", summary: "Invoice page fails" });
    let called = false;

    const result = await sendTelegramReply({
      store,
      sender: { sendMessage: async () => { called = true; return { message_id: 1 }; } },
      messageId: "99:8",
      text: "We'll investigate.",
    });

    assert.deepEqual(result, { status: "not-question" });
    assert.equal(called, false);
  });

  it("does not resend a reply after Telegram has confirmed it", async () => {
    const store = questionStore();
    let sends = 0;
    const sender = { sendMessage: async () => { sends += 1; return { message_id: 77 }; } };

    await sendTelegramReply({ store, sender, messageId: "99:8", text: "Open Billing from your profile." });
    const retry = await sendTelegramReply({ store, sender, messageId: "99:8", text: "Open Billing from your profile." });

    assert.deepEqual(retry, { status: "already-sent" });
    assert.equal(sends, 1);
  });

  it("records a delivery failure and allows a corrected retry", async () => {
    const store = questionStore();
    const failed = await sendTelegramReply({
      store,
      sender: { sendMessage: async () => { throw new Error("bot blocked by customer"); } },
      messageId: "99:8",
      text: "Try the Billing page.",
    });

    assert.deepEqual(failed, { status: "failed", error: "bot blocked by customer" });
    assert.deepEqual(store.get("99:8")?.triage?.reply, {
      text: "Try the Billing page.",
      status: "failed",
      error: "bot blocked by customer",
    });
  });
});
