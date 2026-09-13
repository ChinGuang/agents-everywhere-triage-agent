import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MessageStore } from "./store";
import type { InboundMessage } from "../telegram";

const msg = (over: Partial<InboundMessage> & { messageId: number; chatId: number }): InboundMessage => ({
  updateId: over.messageId,
  fromName: "Ada",
  text: "hello",
  date: 1710000000,
  ...over,
});

describe("MessageStore", () => {
  let store: MessageStore;
  beforeEach(() => {
    store = new MessageStore();
  });

  it("adds a message, assigns a stable id, and lists it", () => {
    assert.equal(store.add(msg({ messageId: 10, chatId: 555, text: "hi" })), true);
    const list = store.list();
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, "555:10");
    assert.equal(list[0]?.triage, undefined);
  });

  it("dedupes by chat + message id", () => {
    store.add(msg({ messageId: 10, chatId: 555 }));
    assert.equal(store.add(msg({ messageId: 10, chatId: 555, text: "changed" })), false);
    assert.equal(store.list().length, 1);
    assert.equal(store.list()[0]?.text, "hello");
  });

  it("keeps same message id from different chats apart", () => {
    store.add(msg({ messageId: 10, chatId: 1 }));
    store.add(msg({ messageId: 10, chatId: 2 }));
    assert.deepEqual(store.list().map((m) => m.id), ["1:10", "2:10"]);
  });

  it("setTriage attaches a result and reports success", () => {
    store.add(msg({ messageId: 10, chatId: 555 }));
    assert.equal(store.setTriage("555:10", { type: "bug", summary: "it broke" }), true);
    assert.deepEqual(store.get("555:10")?.triage, { type: "bug", summary: "it broke" });
  });

  it("setTriage returns false for an unknown id", () => {
    assert.equal(store.setTriage("nope:1", { type: "question", summary: "?" }), false);
  });

  it("untriaged() returns only messages without a triage result", () => {
    store.add(msg({ messageId: 1, chatId: 1 }));
    store.add(msg({ messageId: 2, chatId: 1 }));
    store.setTriage("1:1", { type: "feedback", summary: "nice" });
    assert.deepEqual(store.untriaged().map((m) => m.id), ["1:2"]);
  });
});
