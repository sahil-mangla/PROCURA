"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Bot, ChevronDown, Cog, TriangleAlert, User } from "lucide-react";
import { Pct } from "@/components/motion/Pct";
import { panel } from "@/components/ledger";
import type { AiAnalysis, HistoryEntry } from "@/lib/api/types";
import { dateTime, decisionLabel, humanize, pct, roleLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AiDetails } from "./AiDetails";

type Lane = "ai" | "human" | "system";
const laneOf = (e: HistoryEntry): Lane => (e.actorType === "AI" ? "ai" : e.actorType === "SYSTEM" ? "system" : "human");

const eventTitle: Record<HistoryEntry["event"], string> = {
  REQUEST_CREATED: "Created the request",
  REQUEST_SUBMITTED: "Submitted the request",
  AI_ANALYSIS_COMPLETED: "AI analysis",
  AI_UNAVAILABLE: "AI analysis unavailable",
  DEPARTMENT_APPROVED: "Department approved",
  HUMAN_REVIEW_REQUIRED: "Human review required",
  INFO_REQUESTED: "Requested more information",
  REQUEST_REJECTED: "Rejected",
  FINANCE_APPROVED: "Finance approved",
  PO_GENERATED: "Purchase order issued",
  PO_GENERATION_FAILED: "Purchase order failed",
};

function VoiceChip({ lane }: { lane: Lane }) {
  const Icon = lane === "ai" ? Bot : lane === "human" ? User : Cog;
  const c = lane === "ai" ? "bg-ai/12 text-ai" : lane === "human" ? "bg-human/12 text-human" : "bg-muted text-muted-foreground";
  return (
    <span className={`grid size-8 shrink-0 place-items-center rounded-full ${c}`}>
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

function Dot({ lane, dashed }: { lane: Lane; dashed?: boolean }) {
  const c = lane === "ai" ? "bg-ai" : lane === "human" ? "bg-human" : "bg-muted-foreground";
  return dashed ? (
    <span className="z-10 mt-[1.15rem] size-3.5 rounded-full border-2 border-dashed border-human bg-[#eef4f0]" aria-hidden />
  ) : (
    <span className={`z-10 mt-[1.15rem] size-3.5 rounded-full ring-[5px] ring-[#eef4f0] ${c}`} aria-hidden />
  );
}

function ConfidenceMeter({ analysis }: { analysis: AiAnalysis }) {
  return (
    <div className="relative mx-3.5 mb-2.5 h-[3px] rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-ai" style={{ width: `${pct(analysis.confidence)}%` }} />
      <span className="absolute -top-[3px] h-[9px] w-px bg-foreground/70" style={{ left: `${pct(analysis.reviewThreshold)}%` }} />
    </div>
  );
}

/**
 * One compact row. With details it opens a floating card over the page, so the page never changes height
 * (interaction rule 1). Without details it is a plain button, such as the jump to the decision panel.
 */
function TimelineRow({
  id, lane, openId, onOpenChange, onPress, title, sub, badges, meter, dashed, cta, children,
}: {
  id: string; lane: Lane; openId: string | null; onOpenChange: (open: boolean) => void; onPress?: () => void;
  title: string; sub: string; badges?: React.ReactNode; meter?: React.ReactNode; dashed?: boolean; cta?: string; children?: React.ReactNode;
}) {
  const border = dashed ? "border-dashed border-human/60" : lane === "ai" ? "border-ai/35" : lane === "human" ? "border-human/35" : "border-border";
  const head = (
    <button type="button" onClick={onPress} className="group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left">
      <VoiceChip lane={lane} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-tight font-semibold tracking-tight">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      {badges}
      {cta && <span className="shrink-0 rounded-full bg-human px-2.5 py-1 text-xs font-semibold text-white">{cta}</span>}
      {children && <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" aria-hidden />}
    </button>
  );
  const shell = cn(panel, border, "transition-[background-color] duration-300 hover:bg-card");
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
          className="z-40 max-h-[min(72vh,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] min-w-72 overflow-y-auto rounded-2xl border border-border bg-card/[0.97] p-4 text-foreground shadow-[0_34px_70px_-26px_rgba(20,35,59,0.6),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

type Props = {
  history: HistoryEntry[];
  analyses: AiAnalysis[];
  /** Shown as a dashed row at the end when the current user has a decision to make. */
  pending?: { title: string; sub: string } | null;
};

/** Approval history from the Trace direction: AI on the left lane, people on the right. */
export function Timeline({ history, analyses, pending }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const byId = new Map(analyses.map((a) => [a.id, a]));

  const goToDecision = () => {
    const el = document.getElementById("decision-panel");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  if (history.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No history yet.</p>;

  return (
    <div className="py-3">
      <div className="mb-3 hidden grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] text-xs font-semibold md:grid" aria-hidden>
        <span className="pr-5 text-right text-ai">AI</span>
        <span />
        <span className="pl-5 text-human">People</span>
      </div>
      <ol className="relative space-y-3 before:absolute before:top-3 before:bottom-3 before:left-[0.8125rem] before:w-px before:bg-gradient-to-b before:from-transparent before:via-[#8aa592] before:to-transparent md:before:left-1/2 md:before:-translate-x-1/2">
        {history.map((e) => {
          const lane = laneOf(e);
          const isAi = lane === "ai";
          const key = String(e.id);
          const analysis = e.analysisId != null ? byId.get(e.analysisId) : undefined;
          const who = isAi ? (e.modelVersion ?? "AI") : e.actor ? `${e.actor.name}${e.actor.role ? `, ${roleLabel[e.actor.role]}` : ""}` : "System";
          const title = isAi && analysis ? `Recommended ${humanize(analysis.recommendation).toLowerCase()}` : e.decision ? decisionLabel[e.decision] : eventTitle[e.event];
          const row = (
            <TimelineRow
              id={key}
              lane={lane}
              openId={openId}
              onOpenChange={(o) => setOpenId(o ? key : null)}
              title={title}
              sub={`${who}, ${dateTime(e.at)}`}
              meter={analysis ? <ConfidenceMeter analysis={analysis} /> : undefined}
              badges={
                analysis ? (
                  <span className="shrink-0 rounded-full bg-ai/12 px-2 py-0.5 text-xs font-semibold text-ai tnum">
                    <Pct value={pct(analysis.confidence)} />
                  </span>
                ) : e.override ? (
                  <span className="hidden shrink-0 items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-semibold text-destructive sm:inline-flex">
                    <TriangleAlert className="size-3" aria-hidden /> Disagrees with AI
                  </span>
                ) : undefined
              }
            >
              {analysis ? (
                <AiDetails analysis={analysis} />
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{e.comment ?? "No comment recorded."}</p>
                  {e.override && e.aiRecommendation && (
                    <p className="text-destructive">The AI recommended {e.aiRecommendation.toLowerCase()}. This decision differs and both are kept in the audit record.</p>
                  )}
                  {e.fromStatus && e.toStatus && (
                    <p className="text-xs text-muted-foreground">
                      {humanize(e.fromStatus)} → {humanize(e.toStatus)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground tnum">{dateTime(e.at)}</p>
                </div>
              )}
            </TimelineRow>
          );
          return (
            <li key={key} className="relative grid grid-cols-[1.625rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] md:gap-x-0">
              <div className="col-start-2 md:col-start-1 md:row-start-1 md:pr-5">{isAi && row}</div>
              <div className="col-start-1 row-start-1 flex justify-center md:col-start-2">
                <Dot lane={lane} />
              </div>
              <div className="col-start-2 md:col-start-3 md:row-start-1 md:pl-5">{!isAi && row}</div>
            </li>
          );
        })}
        {pending && (
          <li className="relative grid grid-cols-[1.625rem_minmax(0,1fr)] gap-x-3 md:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] md:gap-x-0">
            <div className="col-start-1 row-start-1 flex justify-center md:col-start-2">
              <Dot lane="human" dashed />
            </div>
            <div className="col-start-2 md:col-start-3 md:row-start-1 md:pl-5">
              <TimelineRow id="pending" lane="human" dashed openId={openId} onOpenChange={() => {}} onPress={goToDecision} title={pending.title} sub={pending.sub} cta="Review now" />
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
