import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { motion, useReducedMotion } from "motion/react";
import { Bot, Check, ChevronDown, Cog, TriangleAlert, User } from "lucide-react";
import { WordByWord } from "@/components/rewamp/WordByWord";
import { Typewriter } from "@/components/rewamp/Typewriter";
import { Progress } from "@/components/ui/progress";
import { AI, BUDGET, REQUEST, inr, total, utilisation, type HistoryEntry } from "@/data/mock-request";
import { historyText, matches, PENDING_TEXT } from "@/data/search";
import { useReview, type Decision } from "@/data/useReview";
import { Backdrop } from "../Backdrop";
import { Pct } from "../Pct";
import { PillButton } from "../PillButton";
import { Toast, buildDecisionToast, type ToastData } from "../Toast";
import { TopBar } from "../TopBar";
import { useBodyTheme } from "../useBodyTheme";

const glass = "rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_24px_48px_-28px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]";
const EASE = [0.22, 1, 0.36, 1] as const;

type Lane = "ai" | "human" | "system";
const laneOf = (e: HistoryEntry): Lane => (e.role === "AI" ? "ai" : e.role === "System" ? "system" : "human");
const word = { APPROVE: "Approved", REJECT: "Rejected", REQUEST_INFO: "Info requested" } as const;
const concerns = AI.reasons.filter((r) => r.tone === "concern").length;


function Chip({ lane }: { lane: Lane }) {
  const Icon = lane === "ai" ? Bot : lane === "human" ? User : Cog;
  const c = lane === "ai" ? "bg-ai/20 text-ai" : lane === "human" ? "bg-human/20 text-human" : "bg-white/10 text-muted-foreground";
  return <span className={`grid size-8 shrink-0 place-items-center rounded-full ${c}`}><Icon className="size-4" aria-hidden /></span>;
}

function Dot({ lane, dashed }: { lane: Lane; dashed?: boolean }) {
  const c = lane === "ai" ? "bg-ai" : lane === "human" ? "bg-human" : "bg-muted-foreground";
  return dashed
    ? <span className="z-10 mt-[1.15rem] size-3.5 rounded-full border-2 border-dashed border-human bg-[#0d1424]" aria-hidden />
    : <span className={`z-10 mt-[1.15rem] size-3.5 rounded-full ring-[5px] ring-[#0d1424] ${c}`} aria-hidden />;
}

/**
 * One compact timeline row. Details open in a popover that floats over the page,
 * so the timeline keeps its height and nothing below the row moves.
 */
function Row({
  id, lane, openId, onOpenChange, title, sub, time, badges, meter, dashed, dim, cta, children,
}: {
  id: string; lane: Lane; openId: string | null; onOpenChange: (open: boolean) => void; title: string; sub: string; time?: string;
  badges?: React.ReactNode; meter?: React.ReactNode; dashed?: boolean; dim?: boolean; cta?: string; children?: React.ReactNode;
}) {
  const border = dashed ? "border-dashed border-human/60" : lane === "ai" ? "border-ai/35" : lane === "human" ? "border-human/35" : "border-white/10";
  return (
    <Popover.Root open={openId === id} onOpenChange={onOpenChange}>
      <Popover.Anchor asChild>
        <div className={`${glass} ${border} transition-[opacity,background-color,filter] duration-300 hover:bg-white/[0.09] ${dim ? "opacity-30 saturate-50" : ""}`}>
          <Popover.Trigger asChild>
            <button type="button" className="group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left">
              <Chip lane={lane} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[15px] leading-tight font-semibold tracking-tight">{title}</span>
                <span className="block truncate text-xs text-muted-foreground">{badges && time ? `${sub}, ${time}` : sub}</span>
              </span>
              {badges}
              {cta && <span className="shrink-0 rounded-full bg-human px-2.5 py-1 text-xs font-semibold text-[#1a2233]">{cta}</span>}
              {time && !badges && !cta && <time className="hidden shrink-0 text-xs text-muted-foreground tnum sm:block">{time}</time>}
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" aria-hidden />
            </button>
          </Popover.Trigger>
          {meter}
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-40 max-h-[min(72vh,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-2xl border border-white/14 bg-[#0f1830]/95 p-4 text-foreground shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ConfidenceMeter() {
  return (
    <div className="relative mx-3.5 mb-2.5 h-[3px] rounded-full bg-white/10" aria-hidden>
      <div className="h-full rounded-full bg-ai" style={{ width: `${AI.confidence}%` }} />
      <span className="absolute -top-[3px] h-[9px] w-px bg-foreground/80" style={{ left: `${AI.reviewThreshold}%` }} />
    </div>
  );
}

function AiDetails() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 items-end gap-3">
        <div><p className="text-xs text-muted-foreground">AI recommends</p><p className="font-display text-xl font-semibold tracking-tight text-ai sm:text-2xl">{AI.recommendation}</p></div>
        <div className="text-center"><p className="text-xs text-muted-foreground">Confidence</p><p className="font-display text-xl font-semibold tracking-tight tnum sm:text-2xl"><Pct value={AI.confidence} /></p></div>
        <div className="text-right"><p className="text-xs text-muted-foreground">Risk</p><p className="font-display text-xl font-semibold tracking-tight text-warn sm:text-2xl">{AI.risk}</p></div>
      </div>
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
            <li key={ev.id} className="rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs">
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
      <ul className="divide-y divide-white/10 border-t border-white/10">
        {REQUEST.items.map((i) => (<li key={i.name} className="flex justify-between gap-3 py-2"><span>{i.qty} x {i.name}</span><span className="tnum">{inr(i.qty * i.unit)}</span></li>))}
        <li className="flex justify-between py-2 font-semibold"><span>Total</span><span className="tnum">{inr(total)}</span></li>
      </ul>
    </div>
  );
}

function Stepper({ steps }: { steps: ReturnType<typeof useReview>["workflow"] }) {
  return (
    <ol className="grid grid-cols-3 gap-y-4 sm:grid-cols-6">
      {steps.map((s, i) => (
        <li key={s.id} className="relative flex flex-col gap-2 pr-2">
          <div className="flex items-center gap-2">
            <span className={"grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tnum " + (s.state === "done" ? "bg-ok text-[#0c1a14]" : s.state === "current" ? "bg-human text-[#1a2233] ring-4 ring-human/25" : "bg-white/10 text-muted-foreground")}>
              {s.state === "done" ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={"hidden h-px flex-1 sm:block " + (s.state === "done" ? "bg-ok/70" : "bg-white/15")} aria-hidden />
          </div>
          <span className={"text-xs leading-tight " + (s.state === "pending" ? "text-muted-foreground" : "font-semibold")}>{s.label}</span>
          <span className="sr-only">{s.state === "done" ? "done" : s.state === "current" ? "in progress" : "not started"}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Trace() {
  useBodyTheme("theme-trace", "Trace, PR-1042 request detail");
  const reduce = useReducedMotion();
  const { decision, override, history, workflow, reviewer, submit, reset } = useReview();
  const [pick, setPick] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const needsReason = pick === "REJECT" || pick === "REQUEST_INFO";
  const label = { APPROVE: "Approve", REJECT: "Reject", REQUEST_INFO: "Request info" } as const;

  const record = (action: Decision, why: string) => {
    submit(action, why);
    setOpenId(null);
    setToast(buildDecisionToast(action));
  };
  const clear = () => { reset(); setPick(null); setReason(""); setToast(null); setOpenId(null); };

  const visible = history.filter((h) => matches(historyText(h), query)).length + (!decision && matches(PENDING_TEXT, query) ? 1 : 0);
  const totalRows = history.length + (decision ? 0 : 1);
  const subOf = (e: HistoryEntry) => (e.role === "AI" ? e.actor : e.role === "System" ? "System" : `${e.actor}, ${e.role}`);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 sm:px-6">
      <Backdrop variant="trace" />

      <TopBar activeId="trace" tone="dark" onSearch={setQuery} searchLabel="Search the trace" searchPlaceholder="Search events or REQ-421" onReset={clear} canReset={!!decision} />
      <p className="sr-only" aria-live="polite">{query ? `${visible} of ${totalRows} events match` : ""}</p>

      {/* Hero */}
      <header className={`${glass} p-6 sm:p-9`}>
        <p className="text-sm text-muted-foreground tnum">{REQUEST.id}, {REQUEST.department}</p>
        <h1 className="mt-2 max-w-3xl font-display text-[2.4rem] leading-[1.02] font-bold tracking-[-0.035em] sm:text-6xl">
          <WordByWord text={REQUEST.title} delay={0.1} stagger={0.08} />
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (decision ? (decision.action === "APPROVE" ? "bg-ok text-[#0c1a14]" : "bg-white/15 text-foreground") : "bg-human text-[#1a2233]")}>
            {decision ? { APPROVE: "Approved", REJECT: "Rejected", REQUEST_INFO: "Waiting for requester" }[decision.action] : "Waiting for human review"}
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight tnum">{inr(REQUEST.amount)}</span>
        </div>
        <div className="mt-7 border-t border-white/10 pt-5"><Stepper steps={workflow} /></div>
      </header>

      {/* Timeline */}
      <section className="mt-10" aria-labelledby="tl-h">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="tl-h" className="font-display text-2xl font-semibold tracking-tight">Trace</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <span className="text-ai">AI</span> events on the left, <span className="text-human">people</span> on the right. Select a row to see details.
            </p>
          </div>
          {query && <p className="text-xs text-muted-foreground tnum" aria-hidden>{visible} of {totalRows} match</p>}
        </div>

        <ol className="relative space-y-3 before:absolute before:top-3 before:bottom-3 before:left-[0.8125rem] before:w-px before:bg-gradient-to-b before:from-transparent before:via-white/25 before:to-transparent md:before:left-1/2 md:before:-translate-x-1/2">
          {history.map((e) => {
            const lane = laneOf(e);
            const isAi = lane === "ai";
            const disagrees = e.role === "Finance Manager" && e.decision && e.decision !== "REQUEST_INFO" && e.decision !== AI.recommendation;
            const row = (
              <Row
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
                      <span className="rounded-full bg-ai/20 px-2 py-0.5 font-semibold text-ai tnum"><Pct value={AI.confidence} /></span>
                      <span className="hidden rounded-full bg-warn/20 px-2 py-0.5 font-semibold text-warn sm:inline">{AI.risk.charAt(0) + AI.risk.slice(1).toLowerCase()} risk</span>
                    </span>
                  ) : disagrees ? (
                    <span className="hidden shrink-0 items-center gap-1 rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive sm:inline-flex"><TriangleAlert className="size-3" /> Disagrees with AI</span>
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
              </Row>
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
                <Row id="pending" lane="human" dashed openId={openId} onOpenChange={(o) => setOpenId(o ? "pending" : null)} title="Waiting for human review" sub={AI.humanReviewReason} cta="Review now" dim={!!query && !matches(PENDING_TEXT, query)}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Choose a decision">
                      {(["APPROVE", "REJECT", "REQUEST_INFO"] as const).map((v) => (
                        <button key={v} type="button" aria-pressed={pick === v} onClick={() => setPick(v)}
                          className={"rounded-full px-2 py-2 text-sm font-medium transition-[background-color,color,transform] duration-300 active:scale-[0.97] " + (pick === v ? (v === "REJECT" ? "bg-destructive text-[#1a2233]" : "bg-human text-[#1a2233]") : "text-muted-foreground hover:bg-white/10 hover:text-foreground")}>
                          {label[v]}
                        </button>
                      ))}
                    </div>
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium">Reason {needsReason ? "(required)" : "(optional)"}</span>
                      <textarea value={reason} onChange={(ev) => setReason(ev.target.value)} rows={3} placeholder={pick === "REJECT" ? "For example: non-essential purchase" : "Add context for the record"}
                        className="w-full resize-none rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm placeholder:text-muted-foreground/70" />
                    </label>
                    <PillButton tone="accent" disabled={!pick || (needsReason && !reason.trim())} onClick={() => pick && record(pick, reason.trim())}>
                      {pick ? `Record: ${label[pick].toLowerCase()}` : "Choose a decision"}
                    </PillButton>
                    <p className="text-xs text-muted-foreground">Recorded under {reviewer.name}, {reviewer.role}. The server checks your permission again.</p>
                  </div>
                </Row>
              </div>
            </li>
          )}
        </ol>
        {query && visible === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">No events match "{query}". Try an evidence ID such as REQ-421, or a name.</p>}
      </section>

      {/* Budget and audit */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="Budget and audit">
        <div className={`${glass} p-5`}>
          <h2 className="font-display text-lg font-semibold tracking-tight">Budget</h2>
          <div className="mt-3 flex items-baseline justify-between text-sm"><span className="text-muted-foreground">Used after this request</span><span className="font-display text-2xl font-semibold tracking-tight tnum"><Pct value={utilisation.projected} /></span></div>
          <Progress aria-label="Budget used after this request" value={utilisation.projected} className="mt-2 h-1.5 bg-white/10 [&>div]:bg-human" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Now {utilisation.now}%</span><span>Remaining {inr(utilisation.remaining)} of {inr(BUDGET.departmentBudget)}</span></div>
        </div>
        <div className={`${glass} p-5`}>
          <h2 className="font-display text-lg font-semibold tracking-tight">Audit</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">AI model version</dt><dd className="tnum">{AI.modelVersion}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Review threshold</dt><dd>{AI.reviewThreshold}% confidence</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Human override</dt>
              <dd className="text-right">{decision === null ? "Not decided yet" : override ? <span className="text-destructive">Yes, {reviewer.name} chose {decision.action.toLowerCase()}</span> : "No"}</dd></div>
          </dl>
        </div>
      </section>

      <Toast toast={toast} onClose={() => setToast(null)} tone="dark" />
    </div>
  );
}
