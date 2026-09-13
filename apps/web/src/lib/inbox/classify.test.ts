import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyMessage } from "./classify";

describe("classifyMessage — type", () => {
  it("classifies clear defect reports as bug", () => {
    for (const text of [
      "The app keeps crashing when I upload a file",
      "I'm getting a 500 error on checkout",
      "The export button doesn't work",
      "Login is broken since this morning",
    ]) {
      assert.equal(classifyMessage(text).type, "bug", text);
    }
  });

  it("classifies a defect phrased as a question as bug", () => {
    assert.equal(classifyMessage("Why does the page keep crashing?").type, "bug");
  });

  it("classifies genuine questions as question", () => {
    for (const text of [
      "How do I change my password?",
      "What plans do you offer?",
      "Can I export to CSV?",
      "Where is the settings page?",
    ]) {
      assert.equal(classifyMessage(text).type, "question", text);
    }
  });

  it("classifies praise, complaints, and feature requests as feedback", () => {
    for (const text of [
      "I love the new dashboard, great work!",
      "The app is way too slow for me",
      "Please add a dark mode",
      "Could you add a dark mode? The white background is rough at night.",
    ]) {
      assert.equal(classifyMessage(text).type, "feedback", text);
    }
  });

  it("does not treat a bare number like a price as a bug", () => {
    assert.equal(classifyMessage("I paid $500 and I love the product").type, "feedback");
  });

  it("adds a sentiment label to offline feedback", () => {
    assert.equal(classifyMessage("I love the new dashboard!").sentiment, "positive");
    assert.equal(classifyMessage("Please add a dark mode").sentiment, "negative");
  });
});

describe("classifyMessage — summary", () => {
  it("collapses whitespace and keeps short messages intact", () => {
    assert.equal(classifyMessage("  How   do I\nreset?  ").summary, "How do I reset?");
  });

  it("truncates long messages with an ellipsis", () => {
    const { summary } = classifyMessage("a".repeat(200));
    assert.ok(summary.length <= 81);
    assert.ok(summary.endsWith("…"));
  });

  it("never returns an empty summary for whitespace-only input", () => {
    assert.equal(classifyMessage("   ").summary, "(empty message)");
  });
});
