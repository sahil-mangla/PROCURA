"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { recordDecision, retryPurchaseOrder, submitRequest, type ActionResult } from "@/lib/actions";
import type { AllowedAction, HumanDecision, Problem, Recommendation, ReviewTrigger } from "@/lib/api/types";
import { decisionLabel, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HoldToConfirm } from "./HoldToConfirm";
import { Receipt } from "./Receipt";
import { Toast, buildDecisionToast, type ToastData } from "./Toast";

type Props = {
  requestId: string;
  version: number;
  allowedActions: AllowedAction[];
  openReviewId: number | null;
  ai: { recommendation: Recommendation; confidence: number; modelVersion: string } | null;
  triggers: ReviewTrigger[];
  reviewer: { name: string; role: string };
  /** One line on what happens next, for people with nothing to do. */
  idleText: string;
};

const choiceLabel: Record<HumanDecision, string> = { APPROVE: "Approve", REJECT: "Reject", REQUEST_INFORMATION: "Request info" };
const holdText: Record<HumanDecision, string> = { APPROVE: "Hold to approve", REJECT: "Hold to reject", REQUEST_INFORMATION: "Hold to request info" };

/** Plain-language messages for each contract error code (D16). */
function problemMessage(p: Problem): { text: string; signIn?: boolean } {
  switch (p.code) {
    case "WORKFLOW_CONFLICT":
      return { text: "Someone else acted on this request first. The page now shows the latest state, so check it before deciding." };
    case "INVALID_TRANSITION":
      return { text: "This request has moved on, so that action is no longer available. The page now shows the latest state." };
    case "FORBIDDEN":
      return { text: "The server checked again and you do not have permission for this action." };
    case "UNAUTHENTICATED":
      return { text: "Your session has ended. Sign in again, then record the decision.", signIn: true };
    case "VALIDATION_FAILED":
      return { text: p.errors?.map((e) => e.message).join(" ") || p.detail || "Some details are missing. Check the form and try again." };
    case "BUSINESS_RULE_VIOLATION":
      return { text: p.detail ?? "A procurement rule blocks this action." };
    default:
      return { text: "The server could not record this. Nothing was changed. Try again in a moment." };
  }
}

export function DecisionPanel({ requestId, version, allowedActions, openReviewId, ai, triggers, reviewer, idleText }: Props) {
  const isReview = allowedActions.includes("REVIEW") && openReviewId != null;
  const choices: HumanDecision[] = isReview
    ? ["APPROVE", "REJECT", "REQUEST_INFORMATION"]
    : (["APPROVE", "REJECT", "REQUEST_INFORMATION"] as const).filter((d) => allowedActions.includes(d));
  const canSubmit = allowedActions.includes("SUBMIT");
  const canRetryPo = allowedActions.includes("RETRY_PO");

  const [pick, setPick] = useState<HumanDecision | null>(null);
  const [reason, setReason] = useState("");
  const [recorded, setRecorded] = useState<{ decision: HumanDecision; reason: string; override: boolean } | null>(null);
  const [error, setError] = useState<{ text: string; signIn?: boolean } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const overrides = !!pick && !!ai && pick !== "REQUEST_INFORMATION" && pick !== ai.recommendation;
  const needsReason = pick === "REJECT" || pick === "REQUEST_INFORMATION" || overrides;
  const canRecord = !!pick && (!needsReason || !!reason.trim()) && !pending;

  const handle = (result: ActionResult, onOk: () => void) => {
    if (result.ok) {
      setError(null);
      onOk();
    } else {
      setError(problemMessage(result.problem));
      // The request changed underneath us: show the latest state so the person decides on current facts.
      if (result.problem.code === "WORKFLOW_CONFLICT" || result.problem.code === "INVALID_TRANSITION") router.refresh();
    }
  };

  const record = () => {
    if (!pick || !canRecord) return;
    const decision = pick;
    const comment = reason.trim();
    startTransition(async () => {
      const result = await recordDecision({ requestId, reviewId: isReview ? openReviewId : null, decision, version, comment });
      handle(result, () => {
        setRecorded({ decision, reason: comment, override: overrides });
        setToast(buildDecisionToast(decision, ai));
      });
    });
  };

  const simple = (run: () => Promise<ActionResult>, done: ToastData) =>
    startTransition(async () => handle(await run(), () => setToast(done)));

  const toastEl = <Toast toast={toast} onClose={() => setToast(null)} />;

  if (recorded) {
    return (
      <section id="decision-panel" tabIndex={-1} className="relative overflow-hidden rounded-2xl border-2 border-border bg-card/90 shadow-[0_14px_30px_-20px_rgba(20,35,59,0.35)] backdrop-blur-sm outline-none" aria-labelledby="decision-h">
        <header className="border-b border-border px-5 py-3">
          <h2 id="decision-h" className="text-base font-semibold">Decision recorded</h2>
          <p className="text-xs text-muted-foreground">{reviewer.name} decided: {decisionLabel[recorded.decision].toLowerCase()}.</p>
        </header>
        <div className="space-y-3 px-5 py-4 text-sm">
          {recorded.override && ai ? (
            <p className="font-semibold">
              <span className="bg-[linear-gradient(transparent_55%,#f4e04d_55%)]">You overrode the AI.</span>{" "}
              <span className="font-normal text-muted-foreground">It recommended {ai.recommendation.toLowerCase()} at {pct(ai.confidence)}%. Both are in the audit record.</span>
            </p>
          ) : recorded.decision === "REQUEST_INFORMATION" ? (
            <p className="text-muted-foreground">The requester has been asked to respond. Review resumes when they resubmit.</p>
          ) : (
            <p className="text-muted-foreground">{ai ? "Your decision matches the AI recommendation." : "Recorded without an AI recommendation."} The workflow status above is now up to date.</p>
          )}
          <Receipt
            rows={[
              ["Request", requestId],
              ["AI model", ai?.modelVersion ?? "unavailable"],
              ["AI said", ai ? `${ai.recommendation} ${pct(ai.confidence)}%` : "n/a"],
              ["Decided by", reviewer.name],
              ["Decision", choiceLabel[recorded.decision]],
              ["Override", recorded.override ? "YES" : "No"],
            ]}
            highlight={recorded.override ? "Override" : undefined}
            reason={recorded.reason}
            footer="Recorded just now"
          />
        </div>
        {toastEl}
      </section>
    );
  }

  if (choices.length === 0) {
    return (
      <section id="decision-panel" tabIndex={-1} className="rounded-2xl border border-border/70 bg-card/85 backdrop-blur-sm outline-none" aria-labelledby="decision-h">
        <header className="border-b border-border px-5 py-3">
          <h2 id="decision-h" className="text-base font-semibold">{canSubmit || canRetryPo ? "Your next step" : "Nothing for you to do"}</h2>
          <p className="text-xs text-muted-foreground">{idleText}</p>
        </header>
        {(canSubmit || canRetryPo || error) && (
          <div className="space-y-3 px-5 py-4">
            {canSubmit && (
              <button type="button" disabled={pending} onClick={() => simple(() => submitRequest(requestId, version), { id: Date.now(), kind: "agree", title: "Submitted.", body: "The department head has been notified. AI analysis runs now." })}
                className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {pending ? "Submitting…" : "Submit for approval"}
              </button>
            )}
            {canRetryPo && (
              <button type="button" disabled={pending} onClick={() => simple(() => retryPurchaseOrder(requestId), { id: Date.now(), kind: "agree", title: "Purchase order issued.", body: "The requester and finance have been notified." })}
                className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {pending ? "Generating…" : "Retry purchase order"}
              </button>
            )}
            {error && <ErrorText error={error} />}
          </div>
        )}
        {toastEl}
      </section>
    );
  }

  return (
    <section id="decision-panel" tabIndex={-1} className="relative overflow-hidden rounded-2xl border-2 border-warn/50 bg-card/90 shadow-[0_14px_30px_-20px_rgba(120,80,10,0.45)] backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-labelledby="decision-h">
      <header className="border-b border-warn/40 bg-warn/10 px-5 py-3">
        <h2 id="decision-h" className="text-base font-semibold">{isReview ? "Human review required" : "Your decision"}</h2>
        {isReview && triggers.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
            {triggers.map((t) => (
              <li key={t.source + t.code}>{t.text}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">{idleText}</p>
        )}
      </header>
      <div className="space-y-3 px-5 py-4">
        <div className={cn("grid gap-1.5 rounded-full border border-border bg-muted/60 p-1", choices.length === 3 ? "grid-cols-3" : choices.length === 2 ? "grid-cols-2" : "grid-cols-1")} role="group" aria-label="Choose a decision">
          {choices.map((v) => (
            <button key={v} type="button" aria-pressed={pick === v} onClick={() => setPick(v)}
              className={cn(
                "rounded-full px-2 py-2 text-sm font-medium transition-[background-color,color,transform,box-shadow] duration-300 active:scale-[0.97]",
                pick === v ? cn(v === "REJECT" ? "bg-destructive text-white" : "bg-primary text-primary-foreground", "shadow-[0_6px_14px_-8px_rgba(20,35,59,0.6)]") : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}>
              {choiceLabel[v]}
            </button>
          ))}
        </div>
        {overrides && ai && (
          <p className="text-xs text-destructive">This differs from the AI recommendation ({ai.recommendation.toLowerCase()}). Say why; both are kept in the audit record.</p>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Reason {needsReason ? "(required)" : "(optional)"}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={2000}
            placeholder={pick === "REJECT" ? "For example: non-essential purchase" : pick === "REQUEST_INFORMATION" ? "What does the requester need to add?" : "Add context for the record"}
            className="w-full resize-none rounded-xl border border-input bg-card/90 px-3 py-2 text-sm" />
        </label>
        <HoldToConfirm
          label={pending ? "Recording…" : pick ? (needsReason && !reason.trim() ? "Add a reason to continue" : "") : "Choose a decision"}
          holdLabel={pick ? holdText[pick] : ""}
          disabled={!canRecord}
          tone={pick === "REJECT" ? "destructive" : pick === "APPROVE" ? "primary" : "neutral"}
          onConfirm={record}
        />
        <button type="button" onClick={record} disabled={!canRecord} className="text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors enabled:hover:text-foreground disabled:no-underline disabled:opacity-50">
          Confirm without holding
        </button>
        {error && <ErrorText error={error} />}
        <p className="text-xs text-muted-foreground">Recorded under {reviewer.name}, {reviewer.role}. The server checks your permission again.</p>
      </div>
      {toastEl}
    </section>
  );
}

function ErrorText({ error }: { error: { text: string; signIn?: boolean } }) {
  return (
    <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/8 px-3 py-2 text-sm text-destructive">
      {error.text}{" "}
      {error.signIn && (
        <Link href="/login" className="font-semibold underline underline-offset-4">
          Sign in
        </Link>
      )}
    </p>
  );
}
