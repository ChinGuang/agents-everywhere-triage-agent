import type { MessageStore } from "../inbox/store";
import type { TelegramReply } from "../inbox/types";

export type TelegramReplySender = {
  sendMessage(chatId: number, text: string): Promise<{ message_id: number }>;
};

export type SendReplyResult =
  | { status: "sent"; telegramMessageId: number }
  | { status: "missing" | "not-question" | "already-sent" | "in-progress" | "failed"; error?: string };

/**
 * Send only a reply that an operator has explicitly approved in the browser.
 * The store reservation prevents duplicate sends within this running process.
 */
export async function sendTelegramReply(options: {
  store: MessageStore;
  sender: TelegramReplySender;
  messageId: string;
  text: string;
  now?: () => number;
}): Promise<SendReplyResult> {
  const { store, sender, messageId, text, now = Date.now } = options;
  const message = store.get(messageId);
  if (!message) return { status: "missing" };

  const reservation = store.reserveReply(messageId, text);
  if (reservation !== "reserved") return { status: reservation };

  try {
    const sent = await sender.sendMessage(message.chatId, text);
    const reply: TelegramReply = {
      text,
      status: "sent",
      telegramMessageId: sent.message_id,
      sentAt: now(),
    };
    store.setReply(messageId, reply);
    return { status: "sent", telegramMessageId: sent.message_id };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Telegram could not send the reply";
    store.setReply(messageId, { text, status: "failed", error });
    return { status: "failed", error };
  }
}
