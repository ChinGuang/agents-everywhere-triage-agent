import type { InboundMessage } from "../telegram/index";

/** The category a Message is triaged into — exactly one per Message. */
export type IssueType = "feedback" | "bug" | "question";

export const ISSUE_TYPES: readonly IssueType[] = ["feedback", "bug", "question"];

export function isIssueType(value: unknown): value is IssueType {
  return typeof value === "string" && (ISSUE_TYPES as readonly string[]).includes(value);
}

/** The outcome of triaging one Message: its Issue Type and a one-line summary. */
export interface TriageResult {
  type: IssueType;
  summary: string;
  /** A proposed answer for a customer question. It must be approved before sending. */
  reply?: TelegramReply;
}

export type TelegramReplyStatus = "draft" | "sending" | "sent" | "failed";

/**
 * A reply proposed by the assistant for a Telegram question. Keeping its state
 * with the triage result makes the approval boundary visible after refreshes.
 */
export interface TelegramReply {
  text: string;
  status: TelegramReplyStatus;
  sentAt?: number;
  telegramMessageId?: number;
  error?: string;
}

/**
 * A Message as it lives in the inbox: the raw inbound Message plus a stable `id`
 * the UI and the copilot use to refer to it, and its triage result once triaged.
 */
export interface StoredMessage extends InboundMessage {
  /** Stable inbox id, unique across chats: `${chatId}:${messageId}`. */
  id: string;
  /** Present once the Message has been triaged. */
  triage?: TriageResult;
}

/** The inbox id for a Message — unique across chats. */
export function messageKey(chatId: number, messageId: number): string {
  return `${chatId}:${messageId}`;
}
