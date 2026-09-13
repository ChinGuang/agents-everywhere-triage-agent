import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectFeedbackSentiment } from "./sentiment";

describe("detectFeedbackSentiment", () => {
  it("marks clear praise as positive", () => {
    assert.equal(detectFeedbackSentiment("The new dashboard is fantastic — great work team!"), "positive");
  });

  it("marks complaints and feature requests as needing attention", () => {
    assert.equal(detectFeedbackSentiment("The app is way too slow for me"), "negative");
    assert.equal(detectFeedbackSentiment("Please add a dark mode"), "negative");
  });

  it("does not let a single positive word hide stronger negative feedback", () => {
    assert.equal(detectFeedbackSentiment("Great idea, but the experience is slow and confusing"), "negative");
  });
});
