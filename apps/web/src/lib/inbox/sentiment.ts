import type { FeedbackSentiment } from "./types";

const POSITIVE_SIGNAL =
  /\b(love|great|fantastic|awesome|excellent|amazing|helpful|thanks?|happy|smooth|delightful)\b/g;

const NEGATIVE_SIGNAL =
  /\b(hate|awful|terrible|slow|rough|frustrating|confusing|disappointing|bad|poor|worse|please add|could you add|wish)\b/g;

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

/**
 * A lightweight, deterministic fallback for the live agent's feedback label.
 * Ties are treated as negative: complaints and requests need follow-up, while
 * praise is only positive when its signals outweigh them.
 */
export function detectFeedbackSentiment(text: string): FeedbackSentiment {
  const normalized = text.toLowerCase();
  return countMatches(normalized, POSITIVE_SIGNAL) > countMatches(normalized, NEGATIVE_SIGNAL)
    ? "positive"
    : "negative";
}
