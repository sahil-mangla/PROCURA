import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Check, ChartColumn, FileText, LayoutList, ReceiptIndianRupee, TriangleAlert, Wallet } from "lucide-react";
import { DashboardShell } from "@/components/block/dashboard-shell";
import { FlipText } from "@/components/block/flip-text";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AI, BUDGET, REQUEST, inr, total, utilisation, type HistoryEntry } from "@/data/mock-request";
import { evidenceText, historyText, matches } from "@/data/search";
import { useReview, type Decision } from "@/data/useReview";
import { WordByWord } from "@/components/rewamp/WordByWord";
import { Pct } from "../Pct";
import { useBodyTheme } from "../useBodyTheme";
import { Backdrop } from "../Backdrop";
import { PillButton } from "../PillButton";
import { Toast, buildDecisionToast, type ToastData } from "../Toast";
import { TopBar } from "../TopBar";

export const NAV = [
  {
    id: "work",
    title: "Work",
    items: [
      { id: "mine", label: "My requests", icon: FileText },
      { id: "review", label: "Needs review", icon: LayoutList, count: 3 },
    ],
  },
  {
    id: "money",
    title: "Money",
    items: [
      { id: "budgets", label: "Budgets", icon: Wallet },
      { id: "pos", label: "Purchase orders", icon: ReceiptIndianRupee },
      { id: "ai", label: "AI performance", icon: ChartColumn },
    ],
  },
];

export const riskTone = { LOW: "text-ok", MEDIUM: "text-warn", HIGH: "text-destructive" } as const;

/** Ruled rows like a ledger page: label left, value right of a fixed column. */
export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-border/80 py-2.5 last:border-b-0 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/85 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_14px_30px_-20px_rgba(20,35,59,0.35)] backdrop-blur-sm">
      <header className="flex items-baseline justify-between border-b border-border px-5 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside}
      </header>
      <div className="px-5 py-2">{children}</div>
    </section>
  );
}

export function Stepper({ steps }: { steps: ReturnType<typeof useReview>["workflow"] }) {
  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 sm:grid-cols-3 lg:grid-cols-6">
      {steps.map((s, i) => (
        <li key={s.id} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className={
                "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold tnum " +
                (s.state === "done"
                  ? "border-ok bg-ok text-white"
                  : s.state === "current"
                    ? "border-primary bg-card text-primary ring-2 ring-primary/30"
                    : "border-border bg-card text-muted-foreground")
              }
              aria-hidden
            >
              {s.state === "done" ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={"h-px flex-1 " + (s.state === "done" ? "bg-ok" : "bg-border")} aria-hidden />
          </div>
          <p className={"text-sm leading-tight " + (s.state === "pending" ? "text-muted-foreground" : "font-medium")}>{s.label}</p>
          <p className="text-xs text-muted-foreground">
            <span className="sr-only">{s.state === "done" ? "Done. " : s.state === "current" ? "In progress. " : "Not started. "}</span>
            {s.actor ? `${s.actor}, ${s.at}` : s.state === "current" ? "Waiting for you" : "Not started"}
          </p>
        </li>
      ))}
    </ol>
  );
}

function HistoryRow({ e, dim }: { e: HistoryEntry; dim?: boolean }) {
  const isHuman = e.role === "Department Head" || e.role === "Finance Manager";
  const disagrees = isHuman && e.decision && e.decision !== "REQUEST_INFO" && e.decision !== AI.recommendation;
  return (
    <li className={"grid grid-cols-[6.5rem_1fr] gap-4 border-b border-border/80 py-3 transition-opacity duration-300 last:border-b-0 " + (dim ? "opacity-30" : "")}>
      <time className="text-xs text-muted-foreground tnum">{e.at}</time>
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{e.actor}</span> <span className="text-muted-foreground">({e.role})</span>: {e.action}
        </p>
        {e.comment && <p className="mt-0.5 text-sm text-muted-foreground">{e.comment}</p>}
        {disagrees && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-sm border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs font-medium text-destructive">
            <TriangleAlert className="size-3.5" />
            Disagrees with the AI, which recommended {AI.recommendation} at {AI.confidence}% confidence
          </p>
        )}
      </div>
    </li>
  );
}

export default function Ledger() {
  useBodyTheme("theme-ledger", "Ledger, PR-1042 request detail");
  const reduce = useReducedMotion();
  const { decision, override, history, workflow, reviewer, submit, reset } = useReview();
  const [pick, setPick] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [historyRef] = useAutoAnimate<HTMLUListElement>({ duration: reduce ? 0 : 260 });
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const record = (action: Decision, why: string) => { submit(action, why); setToast(buildDecisionToast(action)); };
  const clear = () => { reset(); setPick(null); setReason(""); setToast(null); };
  const needsReason = pick === "REJECT" || pick === "REQUEST_INFO";

  const label = { APPROVE: "Approved", REJECT: "Rejected", REQUEST_INFO: "Information requested" } as const;

  return (
    <>
    <Backdrop variant="ledger" />
    <DashboardShell
      brand={{ name: "Procure", description: "Approvals" }}
      navigation={NAV}
      activeItemId="review"
      title={<span>Request detail<span className="tnum text-muted-foreground">{"\u2002"}{REQUEST.id}</span></span>}
      headingLevel={1}
      status={decision ? label[decision.action] : "Human review"}
      statusTone={decision ? (decision.action === "APPROVE" ? "success" : "neutral") : "warning"}
      className="min-h-screen"
    >
      <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <TopBar className="xl:col-span-2 py-0" activeId="ledger" tone="light" onSearch={setQuery} searchLabel="Search the request" searchPlaceholder="Search history or REQ-421" onReset={clear} canReset={!!decision} />
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur-md sm:p-8 xl:col-span-2" aria-label="Request summary">
          <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-[#8fd1b9]/70 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-[#efe6a6]/70 blur-3xl" />
          <p className="relative text-sm text-muted-foreground tnum">{REQUEST.id}, {REQUEST.department}</p>
          <h2 className="relative mt-1 max-w-3xl text-3xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl"><WordByWord text={REQUEST.title} delay={0.1} stagger={0.08} /></h2>
          <div className="relative mt-5 flex flex-wrap items-center gap-3">
            <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (decision ? (decision.action === "APPROVE" ? "bg-ok text-white" : "bg-foreground text-background") : "bg-[#f1d27a] text-foreground")}>
              {decision ? label[decision.action] : "Waiting for human review"}
            </span>
            <span className="text-2xl font-semibold tracking-tight tnum">{inr(REQUEST.amount)}</span>
          </div>
        </section>
        {/* Main column */}
        <div className="flex min-w-0 flex-col gap-6">
          <Section title="Request information">
            <dl>
              <Row label="Request ID"><span className="tnum">{REQUEST.id}</span></Row>
              <Row label="Requester">{REQUEST.requester.name}, {REQUEST.requester.role}</Row>
              <Row label="Department">{REQUEST.department}</Row>
              <Row label="Category">{REQUEST.category}</Row>
              <Row label="Vendor">
                <span className="inline-flex flex-wrap items-center gap-2">
                  {REQUEST.vendor.name}
                  {REQUEST.vendor.isNew && <Badge variant="outline" className="border-warn/50 text-warn">New vendor, no prior orders</Badge>}
                </span>
              </Row>
              <Row label="Amount"><span className="tnum text-base">{inr(REQUEST.amount)}</span></Row>
              <Row label="Description"><span className="font-normal leading-relaxed">{REQUEST.description}</span></Row>
            </dl>
            <Table className="mt-3 mb-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Unit price</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REQUEST.items.map((i) => (
                  <TableRow key={i.name}>
                    <TableCell className="whitespace-normal">{i.name}</TableCell>
                    <TableCell className="text-right tnum">{i.qty}</TableCell>
                    <TableCell className="hidden text-right tnum sm:table-cell">{inr(i.unit)}</TableCell>
                    <TableCell className="text-right tnum">{inr(i.qty * i.unit)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold tnum">{inr(total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Section>

          <Section title="Workflow">
            <Stepper steps={workflow} />
          </Section>

          <Section title="Approval history" aside={<span className="text-xs text-muted-foreground">AI and human decisions in one record</span>}>
            <ul ref={historyRef}>
              {history.map((e) => <HistoryRow key={e.id} e={e} dim={!!query && !matches(historyText(e), query)} />)}
            </ul>
          </Section>

          <Section title="Audit">
            <dl>
              <Row label="AI model version"><span className="tnum">{AI.modelVersion}</span></Row>
              <Row label="Review threshold">{AI.reviewThreshold}% confidence</Row>
              <Row label="Human override">
                {decision === null ? (
                  <span className="text-muted-foreground">Not decided yet</span>
                ) : override ? (
                  <span className="text-destructive">Yes. AI recommended {AI.recommendation}; {reviewer.name} decided {decision.action}.</span>
                ) : (
                  <span>No. The decision matches the AI recommendation.</span>
                )}
              </Row>
            </dl>
          </Section>
        </div>

        {/* Right rail */}
        <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-4 xl:self-start">
          <section className="rounded-2xl border border-border/70 bg-card/85 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_14px_30px_-20px_rgba(20,35,59,0.35)] backdrop-blur-sm" aria-labelledby="ai-h">
            <header className="border-b border-border px-5 py-3">
              <h2 id="ai-h" className="text-base font-semibold">AI recommendation</h2>
              <p className="text-xs text-muted-foreground">Decision support. It does not approve anything on its own.</p>
            </header>
            <div className="space-y-4 px-5 py-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Recommends</p>
                  <p className="text-2xl font-semibold text-primary">{AI.recommendation}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="text-2xl font-semibold tnum">
                    <Pct value={AI.confidence} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Risk</p>
                  <p className={"text-2xl font-semibold " + riskTone[AI.risk]}>{AI.risk}</p>
                </div>
              </div>

              <div>
                <div className="relative">
                  <Progress aria-label="AI confidence" value={AI.confidence} className="h-2" />
                  <span className="absolute -top-1 h-4 w-px bg-foreground" style={{ left: `${AI.reviewThreshold}%` }} aria-hidden />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Marker at {AI.reviewThreshold}%: below it, a person must review.</p>
              </div>

              <div>
                <h3 className="mb-1.5 text-sm font-semibold">Why?</h3>
                <ul className="space-y-1.5">
                  {AI.reasons.map((r) => (
                    <li key={r.text} className="flex gap-2 text-sm">
                      {r.tone === "supports" ? <Check className="mt-0.5 size-4 shrink-0 text-ok" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />}
                      <span><span className="sr-only">{r.tone === "supports" ? "Supports: " : "Concern: "}</span>{r.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-1.5 text-sm font-semibold">Evidence from past requests</h3>
                <ul className="divide-y divide-border/80 overflow-hidden rounded-xl border border-border/80">
                  {AI.evidence.map((e) => (
                    <li key={e.id} className={"flex items-center justify-between gap-3 px-3 py-2 text-sm transition-opacity duration-300 " + (query && !matches(evidenceText(e), query) ? "opacity-30" : "")}>
                      <span className="min-w-0">
                        <span className="font-medium tnum">{e.id}</span>
                        <span className="block truncate text-xs text-muted-foreground">{e.summary}, {inr(e.amount)}</span>
                      </span>
                      <Badge variant="outline" className={e.outcome === "APPROVED" ? "border-ok/50 text-ok" : "border-destructive/50 text-destructive"}>{e.outcome === "APPROVED" ? "Approved" : "Rejected"}</Badge>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                Model <span className="tnum">{AI.modelVersion}</span>. Final approval remains subject to workflow.
              </p>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl border-2 border-warn/50 bg-card/90 shadow-[0_14px_30px_-20px_rgba(120,80,10,0.45)] backdrop-blur-sm" aria-labelledby="hr-h">
            <header className="border-b border-warn/40 bg-warn/10 px-5 py-3">
              <h2 id="hr-h" className="text-base font-semibold">
                {decision ? <FlipText loop={false} duration={0.9} key={decision.action}>{label[decision.action]}</FlipText> : "Human review required"}
              </h2>
              <p className="text-xs text-muted-foreground">{AI.humanReviewReason}</p>
            </header>

            {!decision ? (
              <div className="space-y-3 px-5 py-4">
                <div className="grid grid-cols-3 gap-1.5 rounded-full border border-border bg-muted/60 p-1" role="group" aria-label="Choose a decision">
                  {([["APPROVE", "Approve"], ["REJECT", "Reject"], ["REQUEST_INFO", "Request info"]] as const).map(([v, t]) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={pick === v}
                      onClick={() => setPick(v)}
                      className={
                        "rounded-full px-2 py-2 text-sm font-medium transition-[background-color,color,transform,box-shadow] duration-300 active:scale-[0.97] " +
                        (pick === v
                          ? (v === "REJECT" ? "bg-destructive text-white" : "bg-primary text-primary-foreground") + " shadow-[0_6px_14px_-8px_rgba(20,35,59,0.6)]"
                          : "text-muted-foreground hover:bg-card hover:text-foreground")
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Reason {needsReason ? "(required)" : "(optional)"}</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-input bg-card/90 px-3 py-2 text-sm"
                    placeholder={pick === "REJECT" ? "For example: non-essential purchase" : "Add context for the record"}
                  />
                </label>
                <PillButton tone="ink" disabled={!pick || (needsReason && !reason.trim())} onClick={() => pick && record(pick, reason.trim())}>
                  {pick ? `Record ${pick === "APPROVE" ? "approval" : pick === "REJECT" ? "rejection" : "request for information"}` : "Choose a decision"}
                </PillButton>
                <p className="text-xs text-muted-foreground">Recorded under {reviewer.name}, {reviewer.role}. The server checks your permission again.</p>
              </div>
            ) : (
              <div className="relative px-5 py-4 text-sm">
                <motion.div
                  key={decision.action}
                  initial={reduce ? false : { scale: 1.7, opacity: 0, rotate: -14 }}
                  animate={{ scale: 1, opacity: 1, rotate: -4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  className={
                    "absolute top-3 right-4 rounded-sm border-4 px-3 py-1 text-lg font-bold tracking-wide " +
                    (decision.action === "APPROVE" ? "border-primary text-primary" : decision.action === "REJECT" ? "border-destructive text-destructive" : "border-warn text-warn")
                  }
                  aria-hidden
                >
                  {decision.action === "APPROVE" ? "Approved" : decision.action === "REJECT" ? "Rejected" : "On hold"}
                </motion.div>
                <p className="pr-28">You decided: <strong>{label[decision.action]}</strong></p>
                {decision.reason && <p className="mt-1 pr-28 text-muted-foreground">{decision.reason}</p>}
                {override ? (
                  <div className="mt-4 rounded-sm border border-destructive/40 bg-destructive/5 p-3">
                    <p className="font-semibold text-destructive">You overrode the AI</p>
                    <p className="mt-1 text-muted-foreground">
                      AI recommendation: {AI.recommendation} at {AI.confidence}%. Human decision: {decision.action}. Both stay in the audit record.
                    </p>
                  </div>
                ) : decision.action !== "REQUEST_INFO" ? (
                  <p className="mt-4 text-muted-foreground">Your decision matches the AI recommendation. Next: finance approval.</p>
                ) : (
                  <p className="mt-4 text-muted-foreground">The requester has been asked to respond. Review resumes when they do.</p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/85 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_14px_30px_-20px_rgba(20,35,59,0.35)] backdrop-blur-sm" aria-labelledby="bud-h">
            <header className="border-b border-border px-5 py-3">
              <h2 id="bud-h" className="text-base font-semibold">Budget, {REQUEST.department}</h2>
            </header>
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">Used after this request</p>
                <p className="text-xl font-semibold tnum"><Pct value={utilisation.projected} /></p>
              </div>
              <Progress aria-label="Budget used after this request" value={utilisation.projected} className="h-2" />
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Department budget</dt><dd className="tnum">{inr(BUDGET.departmentBudget)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Used today</dt><dd className="tnum">{utilisation.now}%</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Remaining</dt><dd className="tnum">{inr(utilisation.remaining)}</dd></div>
              </dl>
            </div>
          </section>
        </aside>
      </div>
    </DashboardShell>
    <Toast toast={toast} onClose={() => setToast(null)} tone="light" />
    </>
  );
}
