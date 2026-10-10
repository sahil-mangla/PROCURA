import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, FileX2, RotateCcw, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { RaisedButton } from "@/components/ui/raised-button";
import { FlipText } from "@/components/block/flip-text";
import { AI, BUDGET, REQUEST, inr, total, utilisation, type HistoryEntry } from "@/data/mock-request";
import { useReview, type Decision } from "@/data/useReview";
import { Pct } from "../Pct";
import { useBodyTheme } from "../useBodyTheme";
import { Backdrop } from "../Backdrop";
import { WordByWord } from "@/components/rewamp/WordByWord";
import { evidenceText, historyText, matches } from "@/data/search";
import { PillButton } from "../PillButton";
import { Toast, buildDecisionToast, type ToastData } from "../Toast";
import { TopBar } from "../TopBar";
import { HoldToConfirm } from "./HoldToConfirm";
import { Receipt } from "./Receipt";

const paper = "bg-card shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_2px_3px_rgba(31,42,51,0.10),0_18px_36px_-18px_rgba(31,42,51,0.55)]";

/** Rough-edged ink: a displacement filter so the stamp does not look like a clean vector border. */
function InkFilter() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
      </filter>
    </svg>
  );
}

function PunchCard({ steps }: { steps: ReturnType<typeof useReview>["workflow"] }) {
  return (
    <ol className="grid grid-cols-3 gap-y-4 sm:grid-cols-6">
      {steps.map((s) => (
        <li key={s.id} className="flex flex-col items-center gap-1.5 text-center">
          <span
            className={
              "grid size-8 place-items-center rounded-full " +
              (s.state === "done"
                ? "bg-background shadow-[inset_0_2px_3px_rgba(31,42,51,0.45)]"
                : s.state === "current"
                  ? "bg-[#f4e04d] ring-2 ring-foreground/70"
                  : "border-2 border-dashed border-muted-foreground/40")
            }
          >
            {s.state === "done" && <Check className="size-4 text-ok" aria-hidden />}
          </span>
          <span className={"text-xs leading-tight " + (s.state === "pending" ? "text-muted-foreground" : "font-semibold")}>{s.label}</span>
          <span className="text-[11px] text-muted-foreground">
            <span className="sr-only">{s.state === "done" ? "Done. " : s.state === "current" ? "In progress. " : "Not started. "}</span>
            {s.actor ?? (s.state === "current" ? "Waiting" : "")}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Slip({ e, dim }: { e: HistoryEntry; dim?: boolean }) {
  const human = e.role === "Department Head" || e.role === "Finance Manager";
  const disagrees = human && e.decision && e.decision !== "REQUEST_INFO" && e.decision !== AI.recommendation;
  return (
    <li className={"grid grid-cols-[5.5rem_1fr] gap-3 border-b border-dashed border-border py-3 transition-opacity duration-300 last:border-b-0 " + (dim ? "opacity-30" : "")}>
      <time className="text-xs text-muted-foreground tnum">{e.at}</time>
      <div>
        <p className="text-sm"><strong>{e.actor}</strong> <span className="text-muted-foreground">({e.role})</span>: {e.action}</p>
        {e.comment && <p className="mt-0.5 text-sm text-muted-foreground">{e.comment}</p>}
        {disagrees && (
          <p className="mt-1.5 text-sm font-semibold">
            <TriangleAlert className="mr-1 inline size-4 -translate-y-px text-destructive" aria-hidden />
            <span className="bg-[linear-gradient(transparent_55%,#f4e04d_55%)]">Disagrees with the AI ({AI.recommendation}, {AI.confidence}%)</span>
          </p>
        )}
      </div>
    </li>
  );
}

export default function Docket() {
  useBodyTheme("theme-docket", "Docket, PR-1042 request detail");
  const reduce = useReducedMotion();
  const { decision, override, history, workflow, reviewer, submit, reset } = useReview();
  const [pick, setPick] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const needsReason = pick === "REJECT" || pick === "REQUEST_INFO";
  const word = { APPROVE: "Approved", REJECT: "Rejected", REQUEST_INFO: "On hold" } as const;
  const holdText = { APPROVE: "Hold to approve", REJECT: "Hold to reject", REQUEST_INFO: "Hold to request info" } as const;

  useEffect(() => {
    if (!decision) return;
    setCanUndo(true);
    const t = setTimeout(() => setCanUndo(false), 6000);
    return () => clearTimeout(t);
  }, [decision]);

  const clear = () => { reset(); setPick(null); setReason(""); setCanUndo(false); setToast(null); };
  const record = (action: Decision, why: string) => { submit(action, why); setToast(buildDecisionToast(action)); };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <Backdrop variant="docket" />
      <InkFilter />
      <TopBar activeId="docket" tone="light" onSearch={setQuery} searchLabel="Search the docket" searchPlaceholder="Search history or REQ-421" onReset={clear} canReset={!!decision} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* The docket */}
        <motion.main
          animate={decision && !reduce ? { y: [0, 4, 0] } : { y: 0 }}
          transition={{ delay: 0.22, duration: 0.25 }}
          className={`relative grid grid-cols-1 rounded-sm sm:grid-cols-[3.25rem_1fr] ${paper}`}
        >
          <div className="hidden items-center justify-center border-r-2 border-dashed border-border sm:flex" aria-hidden>
            <span className="text-sm font-semibold tracking-wide text-muted-foreground [writing-mode:vertical-rl] rotate-180 tnum">{REQUEST.id}, {REQUEST.department}</span>
          </div>

          <div className="min-w-0 p-5 sm:p-8">
            <header className={"relative " + (decision ? "sm:pr-44" : "")}>
              <p className="text-sm text-muted-foreground">Purchase request {REQUEST.id}</p>
              <h1 className="mt-1 font-display text-3xl leading-[1.05] font-bold tracking-[-0.03em] sm:text-[2.6rem]"><WordByWord text={REQUEST.title} delay={0.1} stagger={0.08} /></h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Badge className="bg-[#f4e04d] text-foreground">
                  {decision ? <FlipText loop={false} duration={0.8} key={decision.action}>{word[decision.action]}</FlipText> : "Waiting for human review"}
                </Badge>
                <span className="font-display text-2xl tnum">{inr(REQUEST.amount)}</span>
              </div>
              {decision && (
                <motion.div
                  key={decision.action}
                  initial={reduce ? false : { scale: 2.3, opacity: 0, rotate: -22 }}
                  animate={{ scale: 1, opacity: 0.92, rotate: -9 }}
                  transition={{ type: "spring", stiffness: 360, damping: 26 }}
                  className={"pointer-events-none absolute top-0 right-0 hidden rounded-md border-[5px] px-4 py-1.5 font-display text-3xl font-bold mix-blend-multiply sm:block " + (decision.action === "APPROVE" ? "border-primary text-primary" : decision.action === "REJECT" ? "border-destructive text-destructive" : "border-warn text-warn")}
                  style={{ filter: "url(#ink)" }}
                  aria-hidden
                >
                  {word[decision.action]}
                </motion.div>
              )}
            </header>

            <section className="mt-8" aria-labelledby="info-h">
              <h2 id="info-h" className="font-display text-xl">Request information</h2>
              <dl className="mt-2 grid gap-x-8 sm:grid-cols-2">
                {([
                  ["Request ID", REQUEST.id],
                  ["Requester", `${REQUEST.requester.name}, ${REQUEST.requester.role}`],
                  ["Department", REQUEST.department],
                  ["Category", REQUEST.category],
                  ["Vendor", REQUEST.vendor.name],
                ] as const).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-dashed border-border py-2 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
                ))}
                <div className="flex justify-between gap-4 border-b border-dashed border-border py-2 text-sm"><dt className="text-muted-foreground">Vendor history</dt><dd className="text-right font-semibold"><span className="bg-[linear-gradient(transparent_55%,#f4e04d_55%)]">New vendor, no prior orders</span></dd></div>
              </dl>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{REQUEST.description}</p>
              <table className="mt-4 w-full text-sm">
                <caption className="sr-only">Items</caption>
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 font-medium">Item</th><th className="py-1 text-right font-medium">Qty</th><th className="py-1 text-right font-medium">Unit price</th><th className="py-1 text-right font-medium">Total</th></tr></thead>
                <tbody>
                  {REQUEST.items.map((i) => (
                    <tr key={i.name} className="border-t border-dashed border-border"><td className="py-2">{i.name}</td><td className="py-2 text-right tnum">{i.qty}</td><td className="py-2 text-right tnum">{inr(i.unit)}</td><td className="py-2 text-right tnum">{inr(i.qty * i.unit)}</td></tr>
                  ))}
                  <tr className="border-t-2 border-foreground/70 font-semibold"><td className="py-2" colSpan={3}>Total</td><td className="py-2 text-right tnum">{inr(total)}</td></tr>
                </tbody>
              </table>
            </section>

            <section className="mt-8" aria-labelledby="wf-h">
              <h2 id="wf-h" className="mb-3 font-display text-xl">Workflow</h2>
              <PunchCard steps={workflow} />
            </section>

            <section className="mt-8" aria-labelledby="hist-h">
              <h2 id="hist-h" className="font-display text-xl">Approval history</h2>
              <ul className="mt-1">{history.map((e) => <Slip key={e.id} e={e} dim={!!query && !matches(historyText(e), query)} />)}</ul>
            </section>

            <section className="mt-8" aria-labelledby="audit-h">
              <h2 id="audit-h" className="font-display text-xl">Audit</h2>
              <dl className="mt-1 text-sm">
                <div className="flex justify-between border-b border-dashed border-border py-2"><dt className="text-muted-foreground">AI model version</dt><dd className="tnum">{AI.modelVersion}</dd></div>
                <div className="flex justify-between border-b border-dashed border-border py-2"><dt className="text-muted-foreground">Human override</dt>
                  <dd className="text-right">{decision === null ? "Not decided yet" : override ? <span className="font-semibold"><span className="bg-[linear-gradient(transparent_55%,#f4e04d_55%)]">Yes: AI said {AI.recommendation}, {reviewer.name} chose {decision.action.replace("_", " ").toLowerCase()}</span></span> : "No"}</dd>
                </div>
              </dl>
            </section>
          </div>
        </motion.main>

        {/* Right: slips on the desk */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-4 lg:self-start">
          <section className={`rounded-sm p-5 ${paper} lg:-rotate-[0.6deg]`} aria-labelledby="ai-h">
            <h2 id="ai-h" className="font-display text-xl">AI recommendation</h2>
            <p className="text-xs text-muted-foreground">Decision support only. Final approval remains subject to workflow.</p>
            <div className="mt-3 grid grid-cols-3 items-end gap-2">
              <div><p className="text-xs text-muted-foreground">Recommends</p><p className="font-display text-xl font-bold text-primary">{AI.recommendation}</p></div>
              <div className="text-center"><p className="text-xs text-muted-foreground">Confidence</p><p className="font-display text-xl font-bold tnum"><Pct value={AI.confidence} /></p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">Risk</p><p className="font-display text-xl font-bold text-warn">{AI.risk}</p></div>
            </div>
            <div className="relative mt-2"><Progress aria-label="AI confidence" value={AI.confidence} className="h-2" /><span className="absolute -top-1 h-4 w-0.5 bg-foreground" style={{ left: `${AI.reviewThreshold}%` }} aria-hidden /></div>
            <p className="mt-1 text-xs text-muted-foreground">Line at {AI.reviewThreshold}%: below it, a person decides.</p>
            <h3 className="mt-4 mb-1.5 text-sm font-semibold">Why?</h3>
            <ul className="space-y-1.5">
              {AI.reasons.map((r) => (
                <li key={r.text} className="flex gap-2 text-sm">
                  {r.tone === "supports" ? <Check className="mt-0.5 size-4 shrink-0 text-ok" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />}
                  <span><span className="sr-only">{r.tone === "supports" ? "Supports: " : "Concern: "}</span>{r.text}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-4 mb-1.5 text-sm font-semibold">Evidence</h3>
            <ul className="divide-y divide-dashed divide-border border-y border-dashed border-border">
              {AI.evidence.map((ev) => (
                <li key={ev.id} className={"flex items-center justify-between gap-2 py-1.5 text-sm transition-opacity duration-300 " + (query && !matches(evidenceText(ev), query) ? "opacity-30" : "")}>
                  <span><span className="font-semibold tnum">{ev.id}</span> <span className="text-xs text-muted-foreground">{ev.summary}, {inr(ev.amount)}</span></span>
                  <span className={"text-xs font-semibold " + (ev.outcome === "APPROVED" ? "text-ok" : "text-destructive")}>{ev.outcome === "APPROVED" ? "Approved" : "Rejected"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Model <span className="tnum">{AI.modelVersion}</span></p>
          </section>

          <section className={`rounded-sm p-5 ${paper}`} aria-labelledby="hr-h">
            <h2 id="hr-h" className="font-display text-xl"><span className="bg-[linear-gradient(transparent_55%,#f4e04d_55%)]">{decision ? "Decision recorded" : "Human review required"}</span></h2>
            <p className="mt-1 text-sm text-muted-foreground">{decision ? `${reviewer.name} decided: ${word[decision.action].toLowerCase()}.` : AI.humanReviewReason}</p>

            {!decision ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Choose a decision">
                  <RaisedButton size="sm" color="#2b5fbf" aria-pressed={pick === "APPROVE"} onClick={() => setPick("APPROVE")} className={pick === "APPROVE" ? "ring-2 ring-foreground ring-offset-2" : ""}>Approve</RaisedButton>
                  <RaisedButton size="sm" color="#d1342a" aria-pressed={pick === "REJECT"} onClick={() => setPick("REJECT")} className={pick === "REJECT" ? "ring-2 ring-foreground ring-offset-2" : ""}>Reject</RaisedButton>
                  <RaisedButton size="sm" color="#e8ecee" aria-pressed={pick === "REQUEST_INFO"} onClick={() => setPick("REQUEST_INFO")} className={pick === "REQUEST_INFO" ? "ring-2 ring-foreground ring-offset-2" : ""}>Request info</RaisedButton>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Reason {needsReason ? "(required)" : "(optional)"}</span>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={pick === "REJECT" ? "For example: non-essential purchase" : "Add context for the record"} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </label>
                <HoldToConfirm
                  label={pick ? (needsReason && !reason.trim() ? "Add a reason to continue" : "") : "Choose a decision"}
                  holdLabel={pick ? holdText[pick] : ""}
                  disabled={!pick || (needsReason && !reason.trim())}
                  tone={pick === "REJECT" ? "destructive" : pick === "APPROVE" ? "primary" : "neutral"}
                  onConfirm={() => pick && record(pick, reason.trim())}
                />
                <p className="text-xs text-muted-foreground">Recorded under {reviewer.name}, {reviewer.role}. The server checks your permission again.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {override && (
                  <p className="text-sm font-semibold"><span className="bg-[linear-gradient(transparent_55%,#f4e04d_55%)]">You overrode the AI.</span> <span className="font-normal text-muted-foreground">It recommended {AI.recommendation} at {AI.confidence}%. Both are in the audit record.</span></p>
                )}
                {canUndo ? (
                  <PillButton tone="quiet" arrow={false} onClick={clear} className="py-2 pr-4 pl-4 text-xs"><span className="inline-flex items-center gap-1.5"><RotateCcw className="size-3.5" aria-hidden /> Undo for a few seconds</span></PillButton>
                ) : (
                  <p className="text-xs text-muted-foreground">The undo window has closed.</p>
                )}
                <Receipt action={decision.action} reason={decision.reason} reviewer={reviewer.name} override={override} />
              </div>
            )}
          </section>

          <section className={`rounded-sm p-5 ${paper} lg:rotate-[0.5deg]`} aria-labelledby="bud-h">
            <h2 id="bud-h" className="font-display text-xl">Budget</h2>
            <div className="mt-2 flex items-baseline justify-between text-sm"><span className="text-muted-foreground">Used after this request</span><span className="font-display text-xl font-bold tnum"><Pct value={utilisation.projected} /></span></div>
            <Progress aria-label="Budget used after this request" value={utilisation.projected} className="mt-1 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">Now {utilisation.now}%. Remaining {inr(utilisation.remaining)} of {inr(BUDGET.departmentBudget)}.</p>
          </section>

          <section className={`rounded-sm ${paper}`} aria-labelledby="po-h">
            <h2 id="po-h" className="sr-only">Purchase order</h2>
            <Empty className="p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon"><FileX2 /></EmptyMedia>
                <EmptyTitle>No purchase order yet</EmptyTitle>
                <EmptyDescription>It is created after finance approves this request.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </section>
        </aside>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} tone="light" />
    </div>
  );
}
