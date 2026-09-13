import type { TelegramApiMessage, TelegramApiResponse, TelegramUpdate } from "./types";

/** Minimal fetch surface we depend on — lets tests inject a fake. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface TelegramClientOptions {
  /** Injectable fetch, defaults to the global. */
  fetchImpl?: FetchLike;
  /** Override the API base (defaults to the public Bot API). */
  baseUrl?: string;
}

/**
 * Thrown when the Bot API returns a non-ok envelope or a transport error.
 * Deliberately carries the API description and error code but NEVER the token —
 * the token is in the request URL, so it must not reach logs via error text.
 */
export class TelegramApiError extends Error {
  constructor(
    readonly method: string,
    readonly description: string,
    readonly code?: number,
  ) {
    super(`Telegram ${method} failed${code ? ` (${code})` : ""}: ${description}`);
    this.name = "TelegramApiError";
  }
}

/**
 * A thin client over the Telegram Bot API covering exactly what the ingest +
 * reply loop needs: `getUpdates` (long-poll) and `sendMessage`.
 */
export class TelegramClient {
  private readonly fetchImpl: FetchLike;
  private readonly base: string;

  constructor(token: string, options: TelegramClientOptions = {}) {
    if (!token) throw new Error("TelegramClient requires a bot token");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.base = `${options.baseUrl ?? "https://api.telegram.org"}/bot${token}`;
  }

  /**
   * Long-poll for new updates. `timeoutSeconds` is Telegram's server-side hold:
   * the request blocks up to that long waiting for an update before returning
   * an empty batch, which keeps us off a busy loop.
   */
  async getUpdates(params: { offset?: number; timeoutSeconds?: number; signal?: AbortSignal } = {}): Promise<TelegramUpdate[]> {
    const body: Record<string, unknown> = {};
    if (params.offset !== undefined) body.offset = params.offset;
    if (params.timeoutSeconds !== undefined) body.timeout = params.timeoutSeconds;
    return this.call<TelegramUpdate[]>("getUpdates", body, params.signal);
  }

  /** Send a text message into a chat and return the message Telegram created. */
  async sendMessage(chatId: number, text: string): Promise<TelegramApiMessage> {
    return this.call<TelegramApiMessage>("sendMessage", { chat_id: chatId, text });
  }

  private async call<T>(method: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.base}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "network error";
      throw new TelegramApiError(method, detail);
    }

    let payload: TelegramApiResponse<T>;
    try {
      payload = (await response.json()) as TelegramApiResponse<T>;
    } catch {
      // A gateway can answer a 5xx with an HTML/empty body; surface it as our
      // own error type (and without the token) rather than a raw SyntaxError.
      throw new TelegramApiError(method, `invalid JSON response (HTTP ${response.status})`, response.status);
    }
    if (!response.ok || !payload.ok || payload.result === undefined) {
      throw new TelegramApiError(method, payload.description ?? `HTTP ${response.status}`, payload.error_code);
    }
    return payload.result;
  }
}
