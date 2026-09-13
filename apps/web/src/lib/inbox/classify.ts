import type { IssueType, TriageResult } from "./types";

const BUG_SIGNAL =
  /\b(bug|error|crash(?:ed|ing|es)?|broken|doesn'?t work|does not work|isn'?t working|not working|can'?t|cannot|fails?|failed|failing|freeze|frozen|stuck|glitch)\b/;

const QUESTION_START = /^(how|what|why|when|where|which|who|can|could|do|does|did|is|are|should|would|will)\b/;

const SUMMARY_MAX = 80;

/**
 * Deterministic, offline triage of one Message into an Issue Type + summary.
 *
 * This is the keyless path: it needs no LLM, so the inbox and Triage Cards can
 * be built and demoed without spending OpenAI calls. The copilot's LLM-driven
 * triage produces the same {type, summary} shape; this is the local fallback.
 *
 * Precedence is deliberate: a defect wins even when phrased as a question
 * ("why does it keep crashing?" is a bug, not a question), because that's the
 * one a support agent must not miss.
 */
export function classifyMessage(text: string): TriageResult {
  const normalized = text.toLowerCase();
  let type: IssueType;
  if (BUG_SIGNAL.test(normalized)) {
    type = "bug";
  } else if (text.trim().endsWith("?") || QUESTION_START.test(text.trim().toLowerCase())) {
    type = "question";
  } else {
    type = "feedback";
  }
  return { type, summary: summarize(text) };
}

function summarize(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) return "(empty message)";
  if (collapsed.length <= SUMMARY_MAX) return collapsed;
  return `${collapsed.slice(0, SUMMARY_MAX)}…`;
}
