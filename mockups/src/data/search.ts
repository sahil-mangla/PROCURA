import { AI, REQUEST, type HistoryEntry } from "./mock-request";

/** Everything a history row can be found by, so search also matches evidence IDs, vendor names and reasons. */
export const historyText = (e: HistoryEntry) =>
  [
    e.actor, e.role, e.action, e.comment ?? "", e.at,
    e.id === "h1" ? [REQUEST.title, REQUEST.vendor.name, REQUEST.category, REQUEST.description, REQUEST.requester.name, ...REQUEST.items.map((i) => i.name)].join(" ") : "",
    e.id === "h2" ? [AI.modelVersion, ...AI.reasons.map((r) => r.text), ...AI.evidence.map((v) => `${v.id} ${v.summary} ${v.outcome}`)].join(" ") : "",
  ].join(" ").toLowerCase();

export const evidenceText = (ev: (typeof AI.evidence)[number]) => `${ev.id} ${ev.summary} ${ev.outcome}`.toLowerCase();
export const PENDING_TEXT = `waiting for human review ${AI.humanReviewReason}`.toLowerCase();

/** Every whitespace-separated term must appear. An empty query matches everything. */
export const matches = (text: string, query: string) => query.toLowerCase().split(/\s+/).filter(Boolean).every((t) => text.includes(t));
