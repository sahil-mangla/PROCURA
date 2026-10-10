import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { motion, useReducedMotion } from "motion/react";
import { Bot, Check, ChevronDown, Cog, ReceiptText, TriangleAlert, User } from "lucide-react";
import { DashboardShell } from "@/components/block/dashboard-shell";
import { Typewriter } from "@/components/rewamp/Typewriter";
import { WordByWord } from "@/components/rewamp/WordByWord";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { AI, BUDGET, REQUEST, inr, total, utilisation, type HistoryEntry } from "@/data/mock-request";
import { evidenceText, historyText, matches, PENDING_TEXT } from "@/data/search";
import { useReview, type Decision } from "@/data/useReview";
import { Backdrop } from "../Backdrop";
import { Pct } from "../Pct";
import { Toast, buildDecisionToast, type ToastData } from "../Toast";
import { TopBar } from "../TopBar";
import { useBodyTheme } from "../useBodyTheme";
import { HoldToConfirm } from "../docket/HoldToConfirm";
import { Receipt } from "../docket/Receipt";
import { NAV as SHELL_NAV, Row as KeyRow, Section, Stepper, riskTone } from "../ledger/Ledger";

const EASE = [0.22, 1, 0.36, 1] as const;
const panel = "rounded-2xl border border-border/70 bg-card/85 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_14px_30px_-20px_rgba(20,35,59,0.35)] backdrop-blur-sm";
const label = { APPROVE: "Approved", REJECT: "Rejected", REQUEST_INFO: "Information requested" } as const;
const concerns = AI.reasons.filter((r) => r.tone === "concern").length;

type Lane = "ai" | "human" | "system";
const laneOf = (e: HistoryEntry): Lane => (e.role === "AI" ? "ai" : e.role === "System" ? "system" : "human");

function VoiceChip({ lane }: { lane: Lane }) {
  const Icon = lane === "ai" ? Bot : lane === "human" ? User : Cog;
  const c = lane === "ai" ? "bg-ai/12 text-ai" : lane === "human" ? "bg-human/12 text-human" : "bg-muted text-muted-foreground";
  return <span className={`grid size-8 shrink-0 place-items-center rounded-full ${c}`}><Icon className="size-4" aria-hidden /></span>;
}

function Dot({ lane, dashed }: { lane: Lane; dashed?: boolean }) {
  const c = lane === "ai" ? "bg-ai" : lane === "human" ? "bg-human" : "bg-muted-foreground";
  return dashed
    ? <span className="z-10 mt-[1.15rem] size-3.5 rounded-full border-2 border-dashed border-human bg-[#eef4f0]" aria-hidden />
    : <span className={`z-10 mt-[1.15rem] size-3.5 rounded-full ring-[5px] ring-[#eef4f0] ${c}`} aria-hidden />;
}

/**
 * One compact timeline row. With details it opens a floating card over the page (the page never changes height).
 * Without details it is a plain button that does something, such as jumping to the decision panel.
 */
function TimelineRow({
  id, lane, openId, onOpenChange, onPress, title, sub, time, badges, meter, dashed, dim, cta, children,
}: {
  id: string; lane: Lane; openId: string | null; onOpenChange: (open: boolean) => void; onPress?: () => void;
  title: string; sub: string; time?: string; badges?: React.ReactNode; meter?: React.ReactNode; dashed?: boolean; dim?: boolean; cta?: string; children?: React.ReactNode;
}) {
  const border = dashed ? "border-dashed border-human/60" : lane === "ai" ? "border-ai/35" : lane === "human" ? "border-human/35" : "border-border";
  const head = (
    <button type="button" onClick={onPress} className="group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left">
      <VoiceChip lane={lane} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-tight font-semibold tracking-tight">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{time ? `${sub}, ${time}` : sub}</span>
      </span>
      {badges}
      {cta && <span className="shrink-0 rounded-full bg-human px-2.5 py-1 text-xs font-semibold text-white">{cta}</span>}
      {children && <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" aria-hidden />}
    </button>
  );
  const shell = `${panel} ${border} transition-[opacity,background-color,filter] duration-300 hover:bg-card ${dim ? "opacity-30 saturate-50" : ""}`;
  if (!children) return <div className={shell}>{head}{meter}</div>;
  return (
    <Popover.Root open={openId === id} onOpenChange={onOpenChange}>
      <Popover.Anchor asChild>
        <div className={shell}>
          <Popover.Trigger asChild>{head}</Popover.Trigger>
          {meter}
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-40 max-h-[min(72vh,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-2xl border border-border bg-card/[0.97] p-4 text-foreground shadow-[0_34px_70px_-26px_rgba(20,35,59,0.6),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ConfidenceMeter() {
  return (
    <div className="relative mx-3.5 mb-2.5 h-[3px] rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-ai" style={{ width: `${AI.confidence}%` }} />
      <span className="absolute -top-[3px] h-[9px] w-px bg-foreground/70" style={{ left: `${AI.reviewThreshold}%` }} />
    </div>
  );
}

function AiDetails() {
  return (
    <div className="space-y-4">
      <p className="min-h-[2.75rem] text-sm leading-relaxed">
        <Typewriter text={`Recommends approval, but ${concerns} concerns pull confidence down to ${AI.confidence}%, below the ${AI.reviewThreshold}% review threshold.`} />
      </p>
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
        <h3 className="mb-1.5 text-sm font-semibold">Evidence</h3>
        <ul className="flex flex-wrap gap-2">
          {AI.evidence.map((ev) => (
            <li key={ev.id} className="rounded-xl border border-border bg-muted/60 px-2.5 py-1.5 text-xs">
              <span className="font-semibold tnum">{ev.id}</span>{" "}
              <span className={ev.outcome === "APPROVED" ? "text-ok" : "text-destructive"}>{ev.outcome === "APPROVED" ? "approved" : "rejected"}</span>
              <span className="block text-muted-foreground">{ev.summary}, {inr(ev.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">Model <span className="tnum">{AI.modelVersion}</span>. Final approval remains subject to workflow.</p>
    </div>
  );
}

function RequestDetails() {
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {([
          ["Requester", `${REQUEST.requester.name}, ${REQUEST.requester.role}`],
          ["Department", REQUEST.department],
          ["Category", REQUEST.category],
          ["Vendor", REQUEST.vendor.name],
        ] as const).map(([k, v]) => (<div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v}</dd></div>))}
        <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Vendor history</dt><dd className="text-warn">New vendor, no prior orders</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Description</dt><dd className="leading-relaxed text-muted-foreground">{REQUEST.description}</dd></div>
      </dl>
      <ul className="divide-y divide-border border-t border-border">
        {REQUEST.items.map((i) => (<li key={i.name} className="flex justify-between gap-3 py-2"><span>{i.qty} x {i.name}</span><span className="tnum">{inr(i.qty * i.unit)}</span></li>))}
        <li className="flex justify-between py-2 font-semibold"><span>Total</span><span className="tnum">{inr(total)}</span></li>
      </ul>
    </div>
  );
}

export default function Mix() {
  useBodyTheme("theme-mix", "Mix, PR-1042 request detail");
  const reduce = useReducedMotion();
  const { decision, override, history, workflow, reviewer, submit, reset } = useReview();
  const [pick, setPick] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const needsReason = pick === "REJECT" || pick === "REQUEST_INFO";
  const canRecord = !!pick && (!needsReason || !!reason.trim());
  const choiceLabel = { APPROVE: "Approve", REJECT: "Reject", REQUEST_INFO: "Request info" } as const;
  const holdText = { APPROVE: "Hold to approve", REJECT: "Hold to reject", REQUEST_INFO: "Hold to request info" } as const;

  const record = () => {
    if (!pick || !canRecord) return;
    submit(pick, reason.trim());
    setOpenId(null);
    setToast(buildDecisionToast(pick));
  };
  const clear = () => { reset(); setPick(null); setReason(""); setToast(null); setOpenId(null); };
  const goToDecision = () => {
    const el = document.getElementById("decision-panel");
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  const subOf = (e: HistoryEntry) => (e.role === "AI" ? e.actor : e.role === "System" ? "System" : `${e.actor}, ${e.role}`);

  return (
    <>
      <Backdrop variant="ledger" />
      <DashboardShell
        brand={{ name: "Procure", description: "Approvals" }}
        navigation={SHELL_NAV}
        activeItemId="review"
        title={<span>Request detail<span className="tnum text-muted-foreground">{" "}{REQUEST.id}</span></span>}
        headingLevel={1}
        status={decision ? label[decision.action] : "Human review"}
        statusTone={decision ? (decision.action === "APPROVE" ? "success" : "neutral") : "warning"}
        className="min-h-screen"
      >
        <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <TopBar className="xl:col-span-2 py-0" activeId="mix" tone="light" onSearch={setQuery} searchLabel="Search the request" searchPlaceholder="Search history or REQ-421" onReset={clear} canReset={!!decision} />

          {/* Hero band (Ledger) */}
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
                <KeyRow label="Request ID"><span className="tnum">{REQUEST.id}</span></KeyRow>
                <KeyRow label="Requester">{REQUEST.requester.name}, {REQUEST.requester.role}</KeyRow>
                <KeyRow label="Department">{REQUEST.department}</KeyRow>
                <KeyRow label="Category">{REQUEST.category}</KeyRow>
                <KeyRow label="Vendor">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {REQUEST.vendor.name}
                    {REQUEST.vendor.isNew && <Badge variant="outline" className="border-warn/50 text-warn">New vendor, no prior orders</Badge>}
                  </span>
                </KeyRow>
                <KeyRow label="Amount"><span className="tnum text-base">{inr(REQUEST.amount)}</span></KeyRow>
                <KeyRow label="Description"><span className="font-normal leading-relaxed">{REQUEST.description}</span></KeyRow>
              </dl>
              <ul className="mt-2 mb-2 divide-y divide-border/80 border-t border-border/80 text-sm">
                {REQUEST.items.map((i) => (
                  <li key={i.name} className="flex justify-between gap-3 py-2"><span>{i.qty} x {i.name}</span><span className="tnum">{inr(i.qty * i.unit)}</span></li>
                ))}
                <li className="flex justify-between gap-3 py-2 font-semibold"><span>Total</span><span className="tnum">{inr(total)}</span></li>
              </ul>
            </Section>

            <Section title="Workflow">
              <Stepper steps={workflow} />
            </Section>

            {/* Approval history: the Trace timeline, in the light theme */}
            <Section title="Approval history" aside={<span className="text-xs text-muted-foreground">Select a row for details</span>}>
              <div className="py-3">
                <div className="mb-3 hidden grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] text-xs font-semibold md:grid" aria-hidden>
                  <span className="pr-5 text-right text-ai">AI</span><span /><span className="pl-5 text-human">People</span>
                </div>
                <ol className="relative space-y-3 before:absolute before:top-3 before:bottom-3 before:left-[0.8125rem] before:w-px before:bg-gradient-to-b before:from-transparent before:via-[#8aa592] before:to-transparent md:before:left-1/2 md:before:-translate-x-1/2">
                  {history.map((e) => {
                    const lane = laneOf(e);
                    const isAi = lane === "ai";
                    const disagrees = e.role === "Finance Manager" && e.decision && e.decision !== "REQUEST_INFO" && e.decision !== AI.recommendation;
                    const row = (
                      <TimelineRow
                        id={e.id}
                        lane={lane}
                        openId={openId}
                        onOpenChange={(o) => setOpenId(o ? e.id : null)}
                        title={e.action}
                        sub={subOf(e)}
                        time={e.at}
                        dim={!!query && !matches(historyText(e), query)}
                        meter={isAi ? <ConfidenceMeter /> : undefined}
                        badges={
                          isAi ? (
                            <span className="flex shrink-0 items-center gap-1.5 text-xs">
                              <span className="rounded-full bg-ai/12 px-2 py-0.5 font-semibold text-ai tnum"><Pct value={AI.confidence} /></span>
                            </span>
                          ) : disagrees ? (
                            <span className="hidden shrink-0 items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-semibold text-destructive sm:inline-flex"><TriangleAlert className="size-3" /> Disagrees with AI</span>
                          ) : undefined
                        }
                      >
                        {e.id === "h1" && <RequestDetails />}
                        {e.id === "h2" && <AiDetails />}
                        {e.id !== "h1" && e.id !== "h2" && (
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">{e.comment ?? "No comment recorded."}</p>
                            {disagrees && <p className="text-destructive">The AI recommended {AI.recommendation} at {AI.confidence}% confidence. This decision differs and is kept in the audit record.</p>}
                            <p className="text-xs text-muted-foreground tnum">{e.at}</p>
                          </div>
                        )}
                      </TimelineRow>
                    );
                    return (
                      <motion.li
                        key={e.id}
                        initial={e.id === "h5" && !reduce ? { opacity: 0, y: 14 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: EASE }}
                        className="relative grid grid-cols-[1.625rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] md:gap-x-0"
                      >
                        <div className="col-start-2 md:col-start-1 md:row-start-1 md:pr-5">{isAi && row}</div>
                        <div className="col-start-1 row-start-1 flex justify-center md:col-start-2"><Dot lane={lane} /></div>
                        <div className="col-start-2 md:col-start-3 md:row-start-1 md:pl-5">{!isAi && row}</div>
                      </motion.li>
                    );
                  })}

                  {!decision && (
                    <li className="relative grid grid-cols-[1.625rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] md:gap-x-0">
                      <div className="col-start-1 row-start-1 flex justify-center md:col-start-2"><Dot lane="human" dashed /></div>
                      <div className="col-start-2 md:col-start-3 md:row-start-1 md:pl-5">
                        <TimelineRow id="pending" lane="human" dashed openId={openId} onOpenChange={() => {}} onPress={goToDecision} title="Needs your review" sub={AI.humanReviewReason} cta="Review now" dim={!!query && !matches(PENDING_TEXT, query)} />
                      </div>
                    </li>
                  )}
                </ol>
                {query && !history.some((h) => matches(historyText(h), query)) && <p className="mt-4 text-center text-sm text-muted-foreground">No events match "{query}". Try an evidence ID such as REQ-421, or a name.</p>}
              </div>
            </Section>

            <Section title="Audit">
              <dl>
                <KeyRow label="AI model version"><span className="tnum">{AI.modelVersion}</span></KeyRow>
                <KeyRow label="Review threshold">{AI.reviewThreshold}% confidence</KeyRow>
                <KeyRow label="Human override">
                  {decision === null ? (
                    <span className="text-muted-foreground">Not decided yet</span>
                  ) : override ? (
                    <span className="text-destructive">Yes. AI recommended {AI.recommendation}; {reviewer.name} decided {decision.action}.</span>
                  ) : (
                    <span>No. The decision matches the AI recommendation.</span>
                  )}
                </KeyRow>
                <KeyRow label="Decision receipt">{decision ? "Printed in the decision panel" : <span className="text-muted-foreground">Printed when a decision is recorded</span>}</KeyRow>
              </dl>
            </Section>
          </div>

          {/* Right rail */}
          <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-4 xl:self-start">
            <section className={panel} aria-labelledby="ai-h">
              <header className="border-b border-border px-5 py-3">
                <h2 id="ai-h" className="text-base font-semibold">AI recommendation</h2>
                <p className="text-xs text-muted-foreground">Decision support. It does not approve anything on its own.</p>
              </header>
              <div className="space-y-4 px-5 py-4">
                <div className="flex items-end justify-between gap-4">
                  <div><p className="text-xs text-muted-foreground">Recommends</p><p className="text-2xl font-semibold text-primary">{AI.recommendation}</p></div>
                  <div className="text-right"><p className="text-xs text-muted-foreground">Confidence</p><p className="text-2xl font-semibold tnum"><Pct value={AI.confidence} /></p></div>
                  <div className="text-right"><p className="text-xs text-muted-foreground">Risk</p><p className={"text-2xl font-semibold " + riskTone[AI.risk]}>{AI.risk}</p></div>
                </div>
                <div>
                  <div className="relative">
                    <Progress aria-label="AI confidence" value={AI.confidence} className="h-2" />
                    <span className="absolute -top-1 h-4 w-px bg-foreground" style={{ left: `${AI.reviewThreshold}%` }} aria-hidden />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">Marker at {AI.reviewThreshold}%: below it, a person must review.</p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">Evidence from past requests</h3>
                  <ul className="divide-y divide-border/80 overflow-hidden rounded-xl border border-border/80">
                    {AI.evidence.map((e) => (
                      <li key={e.id} className={"flex items-center justify-between gap-3 px-3 py-2 text-sm transition-opacity duration-300 " + (query && !matches(evidenceText(e), query) ? "opacity-30" : "")}>
                        <span className="min-w-0"><span className="font-medium tnum">{e.id}</span><span className="block truncate text-xs text-muted-foreground">{e.summary}, {inr(e.amount)}</span></span>
                        <Badge variant="outline" className={e.outcome === "APPROVED" ? "border-ok/50 text-ok" : "border-destructive/50 text-destructive"}>{e.outcome === "APPROVED" ? "Approved" : "Rejected"}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="border-t border-border pt-3 text-xs text-muted-foreground">Reasons are in the first timeline row. Model <span className="tnum">{AI.modelVersion}</span>. Final approval remains subject to workflow.</p>
              </div>
            </section>

            {/* Decision panel: Ledger frame, Docket hold key and receipt */}
            <section id="decision-panel" tabIndex={-1} className="relative overflow-hidden rounded-2xl border-2 border-warn/50 bg-card/90 shadow-[0_14px_30px_-20px_rgba(120,80,10,0.45)] backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-labelledby="hr-h">
              <header className="border-b border-warn/40 bg-warn/10 px-5 py-3">
                <h2 id="hr-h" className="text-base font-semibold">{decision ? "Decision recorded" : "Human review required"}</h2>
                <p className="text-xs text-muted-foreground">{decision ? `${reviewer.name} decided: ${label[decision.action].toLowerCase()}.` : AI.humanReviewReason}</p>
              </header>

              {!decision ? (
                <div className="space-y-3 px-5 py-4">
                  <div className="grid grid-cols-3 gap-1.5 rounded-full border border-border bg-muted/60 p-1" role="group" aria-label="Choose a decision">
                    {(["APPROVE", "REJECT", "REQUEST_INFO"] as const).map((v) => (
                      <button key={v} type="button" aria-pressed={pick === v} onClick={() => setPick(v)}
                        className={"rounded-full px-2 py-2 text-sm font-medium transition-[background-color,color,transform,box-shadow] duration-300 active:scale-[0.97] " + (pick === v ? (v === "REJECT" ? "bg-destructive text-white" : "bg-primary text-primary-foreground") + " shadow-[0_6px_14px_-8px_rgba(20,35,59,0.6)]" : "text-muted-foreground hover:bg-card hover:text-foreground")}>
                        {choiceLabel[v]}
                      </button>
                    ))}
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Reason {needsReason ? "(required)" : "(optional)"}</span>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={pick === "REJECT" ? "For example: non-essential purchase" : "Add context for the record"}
                      className="w-full resize-none rounded-xl border border-input bg-card/90 px-3 py-2 text-sm" />
                  </label>
                  <HoldToConfirm
                    label={pick ? (needsReason && !reason.trim() ? "Add a reason to continue" : "") : "Choose a decision"}
                    holdLabel={pick ? holdText[pick] : ""}
                    disabled={!canRecord}
                    tone={pick === "REJECT" ? "destructive" : pick === "APPROVE" ? "primary" : "neutral"}
                    onConfirm={record}
                  />
                  <button type="button" onClick={record} disabled={!canRecord} className="text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors enabled:hover:text-foreground disabled:no-underline disabled:opacity-50">
                    Confirm without holding
                  </button>
                  <p className="text-xs text-muted-foreground">Recorded under {reviewer.name}, {reviewer.role}. The server checks your permission again.</p>
                </div>
              ) : (
                <div className="space-y-3 px-5 py-4 text-sm">
                  {decision.reason && <p className="text-muted-foreground">Reason: {decision.reason}</p>}
                  {override ? (
                    <p className="font-semibold"><span className="bg-[linear-gradient(transparent_55%,#f4e04d_55%)]">You overrode the AI.</span> <span className="font-normal text-muted-foreground">It recommended {AI.recommendation} at {AI.confidence}%. Both are in the audit record.</span></p>
                  ) : decision.action !== "REQUEST_INFO" ? (
                    <p className="text-muted-foreground">Your decision matches the AI recommendation. Next: finance approval.</p>
                  ) : (
                    <p className="text-muted-foreground">The requester has been asked to respond. Review resumes when they do.</p>
                  )}
                  <Receipt action={decision.action} reason={decision.reason} reviewer={reviewer.name} override={override} />
                </div>
              )}
            </section>

            <section className={panel} aria-labelledby="bud-h">
              <header className="border-b border-border px-5 py-3"><h2 id="bud-h" className="text-base font-semibold">Budget, {REQUEST.department}</h2></header>
              <div className="space-y-3 px-5 py-4">
                <div className="flex items-baseline justify-between"><p className="text-sm text-muted-foreground">Used after this request</p><p className="text-xl font-semibold tnum"><Pct value={utilisation.projected} /></p></div>
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
