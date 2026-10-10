import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pct } from "@/components/motion/Pct";
import { panel } from "@/components/ledger";
import type { AiAnalysis, AiStatus } from "@/lib/api/types";
import { humanize, inr, pct, riskTone } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusText: Record<Exclude<AiStatus, "COMPLETED">, { title: string; body: string }> = {
  NOT_STARTED: { title: "Not analysed yet", body: "The AI analyses a request when it is submitted." },
  PENDING: { title: "Analysis in progress", body: "Usually takes a few seconds. You can keep working; this panel updates when you reload." },
  UNAVAILABLE: { title: "AI analysis unavailable", body: "The AI service did not respond. The request continues through the standard workflow, with a human review before finance." },
};

/** The AI recommendation card. Decision support only: it states that the AI does not approve anything. */
export function AiPanel({ status, analysis }: { status: AiStatus; analysis: AiAnalysis | null }) {
  return (
    <section className={panel} aria-labelledby="ai-h">
      <header className="border-b border-border px-5 py-3">
        <h2 id="ai-h" className="text-base font-semibold">AI recommendation</h2>
        <p className="text-xs text-muted-foreground">Decision support. It does not approve anything on its own.</p>
      </header>
      {status !== "COMPLETED" || !analysis ? (
        <div className="px-5 py-4">
          <p className={cn("text-sm font-semibold", status === "UNAVAILABLE" && "text-warn")}>{statusText[status === "COMPLETED" ? "PENDING" : status].title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{statusText[status === "COMPLETED" ? "PENDING" : status].body}</p>
        </div>
      ) : (
        <div className="space-y-4 px-5 py-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Recommends</p>
              <p className="text-2xl font-semibold text-primary">{analysis.recommendation}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-2xl font-semibold tnum"><Pct value={pct(analysis.confidence)} /></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Risk</p>
              <p className={cn("text-2xl font-semibold", riskTone[analysis.riskLevel])}>{analysis.riskLevel}</p>
            </div>
          </div>
          <div>
            <div className="relative">
              <Progress aria-label="AI confidence" value={pct(analysis.confidence)} className="h-2" />
              <span className="absolute -top-1 h-4 w-px bg-foreground" style={{ left: `${pct(analysis.reviewThreshold)}%` }} aria-hidden />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Marker at {pct(analysis.reviewThreshold)}%: below it, a person must review.</p>
          </div>
          {analysis.evidence.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-semibold">Evidence from past requests</h3>
              <ul className="divide-y divide-border/80 overflow-hidden rounded-xl border border-border/80">
                {analysis.evidence.map((e) => (
                  <li key={e.requestId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium tnum">{e.requestId}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.summary}, {inr(e.amount)}
                      </span>
                    </span>
                    <Badge variant="outline" className={e.outcome === "APPROVED" ? "border-ok/50 text-ok" : "border-destructive/50 text-destructive"}>
                      {humanize(e.outcome)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.evidenceRejected && <p className="text-xs text-warn">Some evidence the AI cited could not be found in past requests and was left out.</p>}
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            Reasons are in the AI row of the history. Model <span className="tnum">{analysis.modelVersion}</span>. Final approval remains subject to workflow.
          </p>
        </div>
      )}
    </section>
  );
}
