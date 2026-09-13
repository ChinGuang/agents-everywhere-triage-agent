import { MessageStore } from "../inbox/store";
import { TelegramApiError, TelegramClient, runPoller } from "../telegram";

/**
 * Server-side singletons for the triage inbox. In Next dev/prod-node all route
 * handlers share one process, so the store and the Telegram ingest loop live on
 * globalThis — which also survives HMR reloads (otherwise a second poller would
 * spin up). Not for serverless/multi-instance; fine for the demo.
 */
const globals = globalThis as unknown as {
  __inboxStore?: MessageStore;
  __ingestStarted?: boolean;
  __last409LogAt?: number;
};

export function getStore(): MessageStore {
  if (!globals.__inboxStore) globals.__inboxStore = new MessageStore();
  return globals.__inboxStore;
}

/**
 * Start pulling live Telegram messages into the store, once. No-op without a
 * bot token — in that keyless mode the inbox is fed via /api/messages/simulate.
 * Delivers already-queued messages on start (the store dedupes) and self-heals
 * from a 409 (another getUpdates consumer) once that consumer stops.
 */
export function ensureIngest(): void {
  if (globals.__ingestStarted) return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  globals.__ingestStarted = true;
  const client = new TelegramClient(token);
  const store = getStore();

  void runPoller({
    client,
    onError: (error) => {
      if (error instanceof TelegramApiError && error.code === 409) {
        const now = Date.now();
        if (now - (globals.__last409LogAt ?? 0) > 60_000) {
          globals.__last409LogAt = now;
          console.error(
            "[ingest] 409: another Telegram getUpdates consumer is running. Stop it and messages will flow — retrying.",
          );
        }
        return;
      }
      console.error("[ingest]", error instanceof Error ? error.message : error);
    },
    onMessage: (message) => {
      store.add(message);
    },
  });
}
