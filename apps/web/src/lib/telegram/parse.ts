import type { InboundMessage, TelegramApiUser, TelegramUpdate } from "./types";

/** Best-effort display name from Telegram's user fields. */
function displayName(user: TelegramApiUser | undefined): string {
  if (!user) return "Unknown";
  const full = [user.first_name, user.last_name].filter((p) => p && p.trim()).join(" ").trim();
  if (full) return full;
  if (user.username && user.username.trim()) return user.username.trim();
  return "Unknown";
}

/**
 * Normalise a batch of raw Telegram updates into domain InboundMessages.
 *
 * Pure and total: updates without a text message (edits, callbacks, stickers,
 * photos, voice notes) are dropped rather than throwing, so the poller can
 * hand us whatever Telegram sends. Order is preserved.
 */
export function extractInboundMessages(updates: TelegramUpdate[]): InboundMessage[] {
  const messages: InboundMessage[] = [];
  for (const update of updates) {
    const message = update.message;
    if (!message || typeof message.text !== "string") continue;
    messages.push({
      updateId: update.update_id,
      messageId: message.message_id,
      chatId: message.chat.id,
      fromName: displayName(message.from),
      text: message.text,
      date: message.date,
    });
  }
  return messages;
}

/**
 * The offset to pass to the next `getUpdates` call: one past the highest
 * update_id in this batch, which tells Telegram those updates are acknowledged
 * and must not be re-delivered. An empty batch leaves the offset untouched.
 */
export function nextOffset(updates: TelegramUpdate[], currentOffset: number): number {
  if (updates.length === 0) return currentOffset;
  const maxId = updates.reduce((max, u) => (u.update_id > max ? u.update_id : max), updates[0]!.update_id);
  return maxId + 1;
}
