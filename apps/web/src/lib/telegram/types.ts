/**
 * Types for the Telegram ingest + reply loop.
 *
 * Two layers live here on purpose:
 *  - the raw Telegram Bot API shapes (`TelegramUpdate`, `TelegramApiMessage`),
 *    kept minimal — only the fields we actually read; and
 *  - the domain shape (`InboundMessage`), which is what the rest of the app
 *    consumes. Downstream code (the inbox, triage) should depend on
 *    `InboundMessage`, never on the raw API shapes.
 */

/** Raw Telegram user, as returned by the Bot API. */
export interface TelegramApiUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

/** Raw Telegram chat, as returned by the Bot API. */
export interface TelegramApiChat {
  id: number;
  type: string;
}

/** Raw Telegram message, as returned by the Bot API (fields we use only). */
export interface TelegramApiMessage {
  message_id: number;
  from?: TelegramApiUser;
  chat: TelegramApiChat;
  date: number;
  text?: string;
}

/** Raw Telegram update, as returned by `getUpdates`. */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramApiMessage;
}

/** Envelope every Bot API method returns. */
export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/**
 * A Customer's inbound Telegram message, normalised into the vocabulary the
 * rest of the app speaks. This is the unit that later gets triaged.
 */
export interface InboundMessage {
  /** The update this came from — used to advance the poll offset. */
  updateId: number;
  /** Telegram's message id within the chat. */
  messageId: number;
  /** The chat to reply into (also the Customer's id for a private chat). */
  chatId: number;
  /** Display name of the Customer, best-effort from Telegram's user fields. */
  fromName: string;
  /** The message body. Only text messages become InboundMessages. */
  text: string;
  /** Unix timestamp (seconds) Telegram assigned to the message. */
  date: number;
}
