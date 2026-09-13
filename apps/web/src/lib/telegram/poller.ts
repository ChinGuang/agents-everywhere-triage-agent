import { extractInboundMessages, nextOffset } from "./parse";
import type { InboundMessage, TelegramUpdate } from "./types";

/** The slice of TelegramClient the poller needs — keeps it easy to fake. */
export interface UpdateSource {
  getUpdates(params?: { offset?: number; timeoutSeconds?: number; signal?: AbortSignal }): Promise<TelegramUpdate[]>;
}

export interface RunPollerOptions {
  client: UpdateSource;
  /** Called once per inbound Customer message, in arrival order. */
  onMessage: (message: InboundMessage) => void | Promise<void>;
  /** Called when a poll cycle or a message handler throws; the loop keeps running. */
  onError?: (error: unknown) => void;
  /** Abort to stop the loop; also cancels an in-flight long-poll. */
  signal?: AbortSignal;
  /** Telegram server-side long-poll hold, in seconds. */
  timeoutSeconds?: number;
  /** Backoff after an error, in ms. */
  errorBackoffMs?: number;
  /**
   * Skip updates that were already queued before the poller started, so a demo
   * begins from "now" instead of replaying yesterday's backlog. Default false.
   */
  skipPendingUpdates?: boolean;
  /** Injectable delay (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Long-poll Telegram and hand each inbound Customer message to `onMessage`.
 *
 * Runs until `signal` aborts (which also cancels the in-flight poll). Errors —
 * whether from a poll cycle or from a single `onMessage` — are reported via
 * `onError` and swallowed so one bad message or timeout never tears the loop
 * down. The offset advances only past updates we actually received, so nothing
 * is dropped or double-delivered.
 */
export async function runPoller(options: RunPollerOptions): Promise<void> {
  const { client, onMessage, onError, signal, timeoutSeconds = 30, errorBackoffMs = 2000 } = options;
  const sleep = options.sleep ?? defaultSleep;

  let offset: number | undefined;

  // Acknowledge (without processing) everything queued before we started.
  if (options.skipPendingUpdates) {
    try {
      const pending = await client.getUpdates({ offset: -1, timeoutSeconds: 0, signal });
      offset = nextOffset(pending, 0);
    } catch (error) {
      if (signal?.aborted) return;
      onError?.(error);
    }
  }

  while (!signal?.aborted) {
    let updates: TelegramUpdate[];
    try {
      updates = await client.getUpdates({ offset, timeoutSeconds, signal });
    } catch (error) {
      if (signal?.aborted) break;
      onError?.(error);
      await sleep(errorBackoffMs);
      continue;
    }

    for (const message of extractInboundMessages(updates)) {
      try {
        await onMessage(message);
      } catch (error) {
        onError?.(error);
      }
    }
    offset = nextOffset(updates, offset ?? 0);
  }
}
