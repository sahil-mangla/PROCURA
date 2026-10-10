"use client";

import { Check, TriangleAlert } from "lucide-react";
import { Typewriter } from "@/components/motion/Typewriter";
import type { AiAnalysis } from "@/lib/api/types";
import { dateTime, humanize, inr, pct } from "@/lib/format";

/** One-sentence summary built only from fields the AI returned, never invented after the fact. */
export function aiSummary(a: AiAnalysis) {
  const concerns = a.reasons.filter((r) => r.tone === "CONCERN").length;
  const rec = a.recommendation === "APPROVE" ? "Recommends approval" : "Recommends rejection";
  const conf = `${pct(a.confidence)}% confidence`;
  if (a.requiresHumanReview) return `${rec} at ${conf}. A person must review it: ${a.reviewTriggers.map((t) => t.text.charAt(0).toLowerCase() + t.text.slice(1)).join("; ")}.`;
  return `${rec} at ${conf}${concerns ? `, with ${concerns} concern${concerns > 1 ? "s" : ""}` : ""}.`;
}

/** Everything the explainability rules require: what, how confident, why, based on what, which model. */
export function AiDetails({ analysis: a, animate = true }: { analysis: AiAnalysis; animate?: boolean }) {
  const summary = aiSummary(a);
  return (
    <div className="space-y-4">
      <p className="min-h-[2.75rem] text-sm leading-relaxed">{animate ? <Typewriter text={summary} /> : summary}</p>
      <div>
        <h3 className="mb-1.5 text-sm font-semibold">Why?</h3>
        <ul className="space-y-1.5">
          {a.reasons.map((r) => (
            <li key={r.code + r.text} className="flex gap-2 text-sm">
              {r.tone === "SUPPORTS" ? <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />}
              <span>
                <span className="sr-only">{r.tone === "SUPPORTS" ? "Supports: " : "Concern: "}</span>
                {r.text}
                {r.evidenceIds && r.evidenceIds.length > 0 && <span className="text-muted-foreground tnum"> ({r.evidenceIds.join(", ")})</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {a.evidence.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-sm font-semibold">Evidence</h3>
          <ul className="flex flex-wrap gap-2">
            {a.evidence.map((ev) => (
              <li key={ev.requestId} className="rounded-xl border border-border bg-muted/60 px-2.5 py-1.5 text-xs">
                <span className="font-semibold tnum">{ev.requestId}</span>{" "}
                <span className={ev.outcome === "APPROVED" ? "text-ok" : "text-destructive"}>{humanize(ev.outcome).toLowerCase()}</span>
                <span className="text-muted-foreground tnum">, {pct(ev.similarity)}% similar</span>
                <span className="block text-muted-foreground">
                  {ev.summary}, {inr(ev.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Model <span className="tnum">{a.modelVersion}</span>, analysed {dateTime(a.analysedAt)}. Final approval remains subject to workflow.
      </p>
    </div>
  );
}
