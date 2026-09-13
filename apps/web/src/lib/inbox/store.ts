import type { InboundMessage } from "../telegram/index";
import type { StoredMessage, TelegramReply, TriageResult } from "./types";
import { messageKey } from "./types";

/**
 * In-memory inbox of inbound Messages and their triage results.
 *
 * Deliberately not a database: for the hackathon demo the whole inbox lives in
 * one server process's memory (see serverStore for the shared singleton). It
 * dedupes on the Telegram chat+message id so a redelivered update never doubles
 * a Message, and preserves arrival order.
 */
export class MessageStore {
  private readonly messages = new Map<string, StoredMessage>();

  /** Add a Message. Returns false if one with the same id already exists. */
  add(message: InboundMessage): boolean {
    const id = messageKey(message.chatId, message.messageId);
    if (this.messages.has(id)) return false;
    this.messages.set(id, { ...message, id });
    return true;
  }

  /** All Messages, in arrival order. */
  list(): StoredMessage[] {
    return [...this.messages.values()];
  }

  /** Messages not yet triaged, in arrival order. */
  untriaged(): StoredMessage[] {
    return this.list().filter((m) => m.triage === undefined);
  }

  get(id: string): StoredMessage | undefined {
    return this.messages.get(id);
  }

  /** Attach a triage result to a Message. Returns false if the id is unknown. */
  setTriage(id: string, triage: TriageResult): boolean {
    const existing = this.messages.get(id);
    if (!existing) return false;
    this.messages.set(id, { ...existing, triage });
    return true;
  }

  /**
   * Atomically reserve a question reply before the network call. This prevents
   * a double-click from posting the same customer reply twice in this process.
   */
  reserveReply(id: string, text: string): "reserved" | "missing" | "not-question" | "already-sent" | "in-progress" {
    const existing = this.messages.get(id);
    if (!existing) return "missing";
    if (existing.triage?.type !== "question") return "not-question";

    const status = existing.triage.reply?.status;
    if (status === "sent") return "already-sent";
    if (status === "sending") return "in-progress";

    this.messages.set(id, {
      ...existing,
      triage: { ...existing.triage, reply: { text, status: "sending" } },
    });
    return "reserved";
  }

  setReply(id: string, reply: TelegramReply): boolean {
    const existing = this.messages.get(id);
    if (!existing || existing.triage?.type !== "question") return false;
    this.messages.set(id, { ...existing, triage: { ...existing.triage, reply } });
    return true;
  }
}
