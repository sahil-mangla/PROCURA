import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pct } from "@/components/motion/Pct";
import { WordByWord } from "@/components/motion/WordByWord";
import { panel, Row, Section, StatusPill, Stepper } from "@/components/ledger";
import { AiPanel } from "@/components/review/AiPanel";
import { DecisionPanel } from "@/components/review/DecisionPanel";
import { Timeline } from "@/components/review/Timeline";
import { api, unwrap } from "@/lib/api/server";
import type { PurchaseRequestDetail, ReviewTrigger } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth";
import { date, humanize, inr, pct, roleLabel, categoryLabel } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/requests/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Request ${decodeURIComponent(id)}` };
}

/** What happens next, for people with nothing to do on this request. */
function idleText(r: PurchaseRequestDetail): string {
  switch (r.status) {
    case "DRAFT": return "This is a draft. Submit it when it is ready; the AI analyses it on submit.";
    case "SUBMITTED": return "Waiting for the department head.";
    case "INFO_REQUESTED": return "Waiting for the requester to add information and resubmit.";
    case "DEPARTMENT_APPROVED": return "Waiting for finance approval.";
    case "HUMAN_REVIEW": return "Waiting for a finance manager's review.";
    case "FINANCE_APPROVED": return "Approved. The purchase order is being generated.";
    case "PO_GENERATED": return `Purchase order ${r.purchaseOrderId ?? ""} has been issued.`;
    case "REJECTED": return "This request was rejected. The reason is in the history.";
  }
}

export default async function RequestDetailPage({ params, searchParams }: PageProps<"/requests/[id]">) {
  const id = decodeURIComponent((await params).id);
  const client = await api();
  const path = { params: { path: { id } } };

  const [request, history, analyses, user] = await Promise.all([
    client.GET("/purchase-requests/{id}", path).then(unwrap),
    client.GET("/purchase-requests/{id}/history", path).then(unwrap),
    client.GET("/purchase-requests/{id}/ai-analyses", path).then(unwrap),
    getCurrentUser(),
  ]);
  const review = request.openReviewId != null ? await client.GET("/reviews/{id}", { params: { path: { id: request.openReviewId } } }).then(unwrap) : null;

  const ai = request.aiAnalysis ?? null;
  const triggers: ReviewTrigger[] = review?.triggers ?? ai?.reviewTriggers.map((t) => ({ ...t, source: "AI" as const })) ?? [];
  const hasDecision = request.allowedActions.some((a) => a === "APPROVE" || a === "REJECT" || a === "REQUEST_INFORMATION" || a === "REVIEW");
  const budget = request.budget;
  const used = budget && budget.total > 0 ? { now: pct((budget.spent + budget.committed) / budget.total), after: pct((budget.spent + budget.committed + request.amount) / budget.total) } : null;

  return (
    <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <Suspense>
        <Notice searchParams={searchParams} />
      </Suspense>

      {/* Hero band */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur-md sm:p-8 xl:col-span-2" aria-label="Request summary">
        <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-[#8fd1b9]/70 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-[#efe6a6]/70 blur-3xl" />
        <p className="relative text-sm text-muted-foreground tnum">
          {request.id}, {request.departmentName}
        </p>
        <h2 className="relative mt-1 max-w-3xl text-3xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl">
          <WordByWord text={request.title} delay={0.1} stagger={0.08} />
        </h2>
        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <StatusPill status={request.status} className="px-3 py-1" />
          <span className="text-2xl font-semibold tracking-tight tnum">{inr(request.amount)}</span>
          {request.allowedActions.includes("EDIT") && (
            <Link href={`/requests/${encodeURIComponent(request.id)}/edit`} className="rounded-full border border-foreground/15 bg-card/70 px-3 py-1 text-xs font-semibold">
              Edit request
            </Link>
          )}
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-6">
        <Section title="Request information">
          <dl>
            <Row label="Request ID"><span className="tnum">{request.id}</span></Row>
            <Row label="Requester">
              {request.requester.name}
              {request.requester.role ? `, ${roleLabel[request.requester.role]}` : ""}
            </Row>
            <Row label="Department">{request.departmentName}</Row>
            {request.category && <Row label="Category">{categoryLabel(request.category)}</Row>}
            {request.priority && <Row label="Priority">{humanize(request.priority)}</Row>}
            <Row label="Vendor">
              <span className="inline-flex flex-wrap items-center gap-2">
                {request.vendor.name}
                {request.vendor.completedOrders === 0 && <Badge variant="outline" className="border-warn/50 text-warn">New vendor, no prior orders</Badge>}
              </span>
            </Row>
            {request.neededBy && <Row label="Needed by">{date(request.neededBy)}</Row>}
            <Row label="Amount"><span className="text-base tnum">{inr(request.amount)}</span></Row>
            {request.description && (
              <Row label="Description"><span className="font-normal leading-relaxed">{request.description}</span></Row>
            )}
          </dl>
          <ul className="mt-2 mb-2 divide-y divide-border/80 border-t border-border/80 text-sm">
            {request.items.map((i, n) => (
              <li key={i.id ?? n} className="flex justify-between gap-3 py-2">
                <span>{i.quantity} x {i.description}</span>
                <span className="tnum">{inr(i.lineTotal ?? i.quantity * i.unitPrice)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 py-2 font-semibold">
              <span>Total</span>
              <span className="tnum">{inr(request.amount)}</span>
            </li>
          </ul>
        </Section>

        <Section title="Workflow">
          <Stepper steps={request.workflowSteps} />
        </Section>

        <Section title="Approval history" aside={<span className="text-xs text-muted-foreground">Select a row for details</span>}>
          <Timeline
            history={history}
            analyses={analyses}
            pending={hasDecision ? { title: "Needs your decision", sub: triggers[0]?.text ?? idleText(request) } : null}
          />
        </Section>

        <Section title="Audit">
          <dl>
            <Row label="AI model version">{ai ? <span className="tnum">{ai.modelVersion}</span> : <span className="text-muted-foreground">No analysis</span>}</Row>
            <Row label="Agent versions">
              {ai ? <span className="tnum">budget {ai.agentVersions.budget}, historical {ai.agentVersions.historical}, risk {ai.agentVersions.risk}</span> : <span className="text-muted-foreground">No analysis</span>}
            </Row>
            <Row label="Review threshold">{ai ? `${pct(ai.reviewThreshold)}% confidence` : <span className="text-muted-foreground">No analysis</span>}</Row>
            <Row label="AI analyses">{analyses.length === 0 ? <span className="text-muted-foreground">None</span> : `${analyses.length} (earlier analyses are kept, never overwritten)`}</Row>
            <Row label="Human overrides">
              {history.some((h) => h.override) ? (
                <span className="text-destructive">Yes. See the rows marked “Disagrees with AI”.</span>
              ) : (
                <span className="text-muted-foreground">None so far</span>
              )}
            </Row>
          </dl>
        </Section>
      </div>

      <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-4 xl:self-start">
        <AiPanel status={request.aiStatus ?? "NOT_STARTED"} analysis={ai} />

        <DecisionPanel
          key={request.id}
          requestId={request.id}
          version={request.version}
          allowedActions={request.allowedActions}
          openReviewId={request.openReviewId ?? null}
          ai={ai ? { recommendation: ai.recommendation, confidence: ai.confidence, modelVersion: ai.modelVersion } : null}
          triggers={triggers}
          reviewer={{ name: user.name, role: roleLabel[user.role] }}
          idleText={idleText(request)}
        />

        {budget && used && (
          <section className={panel} aria-labelledby="bud-h">
            <header className="border-b border-border px-5 py-3">
              <h2 id="bud-h" className="text-base font-semibold">Budget, {request.departmentName}</h2>
            </header>
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">Used after this request</p>
                <p className="text-xl font-semibold tnum"><Pct value={used.after} /></p>
              </div>
              <Progress aria-label="Budget used after this request" value={Math.min(100, used.after)} className="h-2" />
              {used.after > 100 && <p className="text-xs font-semibold text-destructive">This request exceeds the remaining budget.</p>}
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Budget {budget.fiscalYear}</dt><dd className="tnum">{inr(budget.total)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Used or committed</dt><dd className="tnum">{used.now}%</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Remaining</dt><dd className="tnum">{inr(budget.remaining)}</dd></div>
              </dl>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

/** A message passed back from a form action, such as "saved as a draft but could not be submitted". */
async function Notice({ searchParams }: { searchParams: PageProps<"/requests/[id]">["searchParams"] }) {
  const n = (await searchParams).notice;
  const text = Array.isArray(n) ? n[0] : n;
  if (!text) return null;
  return (
    <p role="status" className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm xl:col-span-2">
      {text}
    </p>
  );
}
