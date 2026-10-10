import { Check, X } from "lucide-react";
import type { RequestStatus, WorkflowStep } from "@/lib/api/types";
import { dateTime, statusLabel, statusTone } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Panel recipe from the design doc, section 4.1. */
export const panel =
  "rounded-2xl border border-border/70 bg-card/85 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_14px_30px_-20px_rgba(20,35,59,0.35)] backdrop-blur-sm";

export function Section({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn(panel, className)}>
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside}
      </header>
      <div className="px-5 py-2">{children}</div>
    </section>
  );
}

/** Ruled rows like a ledger page: label left, value right of a fixed column. */
export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-border/80 py-2.5 last:border-b-0 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium">{children}</dd>
    </div>
  );
}

export function StatusPill({ status, className }: { status: RequestStatus; className?: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", statusTone[status], className)}>{statusLabel[status]}</span>;
}

const stepSr = { DONE: "Done. ", CURRENT: "In progress. ", PENDING: "Not started. ", SKIPPED: "Skipped. ", FAILED: "Failed. " } as const;

/** Workflow progress. Steps and their states come from the backend (D15); the UI never derives them. */
export function Stepper({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 sm:grid-cols-3 lg:grid-cols-6">
      {steps.map((s, i) => (
        <li key={s.key} className={cn("flex flex-col gap-1.5", s.state === "SKIPPED" && "opacity-50")}>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold tnum",
                s.state === "DONE" && "border-ok bg-ok text-white",
                s.state === "CURRENT" && "border-primary bg-card text-primary ring-2 ring-primary/30",
                s.state === "FAILED" && "border-destructive bg-destructive text-white",
                (s.state === "PENDING" || s.state === "SKIPPED") && "border-border bg-card text-muted-foreground",
              )}
              aria-hidden
            >
              {s.state === "DONE" ? <Check className="size-3.5" /> : s.state === "FAILED" ? <X className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("h-px flex-1", s.state === "DONE" ? "bg-ok" : "bg-border")} aria-hidden />
          </div>
          <p className={cn("text-sm leading-tight", s.state === "PENDING" ? "text-muted-foreground" : "font-medium")}>{s.label}</p>
          <p className="text-xs text-muted-foreground">
            <span className="sr-only">{stepSr[s.state]}</span>
            {s.actor && s.at ? `${s.actor.name}, ${dateTime(s.at)}` : s.state === "CURRENT" ? "In progress" : s.state === "SKIPPED" ? "Not needed" : "Not started"}
          </p>
        </li>
      ))}
    </ol>
  );
}
