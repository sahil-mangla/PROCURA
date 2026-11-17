import type { Metadata } from "next";
import Link from "next/link";
import { Bot } from "lucide-react";
import { panel } from "@/components/ledger";
import { api, unwrap } from "@/lib/api/server";
import { dateTime, decisionLabel, humanize, pct, riskTone } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "AI oversight" };

// The contract leaves a model's shape open (ai-service.yaml ModelInfo), so read it defensively.
type ModelInfo = {
  version: string;
  algorithm?: string;
  status?: string;
  trainedAt?: string;
  trainingRows?: number;
  metrics?: { accuracy?: number; precision?: number; recall?: number; f1?: number; rocAuc?: number; brierScore?: number };
};

const FILTERS = [
  { label: "All decisions" },
  { label: "Human disagreed", override: true },
  { label: "Human agreed", override: false },
];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const metric = (n: number | undefined, digits = 1) => (n == null ? "n/a" : `${(n * 100).toFixed(digits)}%`);

/** What the AI recommended next to what a person decided, and how each model version performs. Finance managers and admins only. */
export default async function AiOversightPage({ searchParams }: PageProps<"/ai">) {
  const params = await searchParams;
  const filterIndex = Math.max(0, FILTERS.findIndex((f) => f.label === one(params.filter)));
  const filter = FILTERS[filterIndex];
  const model = one(params.model).trim();
  const page = Math.max(0, Number(one(params.page)) || 0);

  const client = await api();
  const [auditResult, modelsResult] = await Promise.all([
    client.GET("/audit/ai-decisions", { params: { query: { override: filter.override, modelVersion: model || undefined, page, size: 20 } } }),
    client.GET("/ai/models"),
  ]);

  if (auditResult.response.status === 403) {
    return (
      <div className="p-4 sm:p-6">
        <section className={`${panel} mx-auto max-w-lg p-6 text-center`}>
          <h2 className="text-lg font-semibold">Not available for your role</h2>
          <p className="mt-1 text-sm text-muted-foreground">AI oversight is for finance managers and admins.</p>
          <Link href="/requests" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Back to requests
          </Link>
        </section>
      </div>
    );
  }

  const audit = unwrap(auditResult);
  const items = audit.items ?? [];
  const models = (modelsResult.response.ok ? (modelsResult.data ?? []) : []) as ModelInfo[];
  const lastPage = Math.max(0, Math.ceil(audit.totalItems / audit.size) - 1);

  const hrefWith = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { filter: filterIndex ? filter.label : undefined, model: model || undefined, page: page || undefined, ...next };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && v !== 0) sp.set(k, String(v));
    const s = sp.toString();
    return s ? `/ai?${s}` : "/ai";
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <section className={panel} aria-labelledby="models-heading">
        <div className="border-b border-border/80 px-5 py-3.5">
          <h2 id="models-heading" className="font-semibold tracking-tight">Models</h2>
          <p className="text-xs text-muted-foreground">Scores on held-out test data. The serving model produces the recommendations below.</p>
        </div>
        {models.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">The AI service did not return any model versions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-5 py-2 font-medium">Version</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Accuracy</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Precision</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Recall</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">F1</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">ROC AUC</th>
                  <th scope="col" className="px-5 py-2 text-right font-medium">Brier (lower is better)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {models.map((m) => (
                  <tr key={m.version}>
                    <th scope="row" className="px-5 py-3 text-left font-semibold">
                      <span className="tnum">{m.version}</span>
                      {m.algorithm && <span className="block text-xs font-normal text-muted-foreground">{humanize(m.algorithm)}{m.trainingRows ? `, ${m.trainingRows} rows` : ""}</span>}
                    </th>
                    <td className="px-3 py-3">
                      {m.status && (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", m.status === "SERVING" ? "bg-ok/12 text-ok" : "bg-muted text-muted-foreground")}>
                          {humanize(m.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tnum">{metric(m.metrics?.accuracy)}</td>
                    <td className="px-3 py-3 text-right tnum">{metric(m.metrics?.precision)}</td>
                    <td className="px-3 py-3 text-right tnum">{metric(m.metrics?.recall)}</td>
                    <td className="px-3 py-3 text-right tnum">{m.metrics?.f1 == null ? "n/a" : m.metrics.f1.toFixed(3)}</td>
                    <td className="px-3 py-3 text-right tnum">{m.metrics?.rocAuc == null ? "n/a" : m.metrics.rocAuc.toFixed(3)}</td>
                    <td className="px-5 py-3 text-right tnum">{m.metrics?.brierScore == null ? "n/a" : m.metrics.brierScore.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="audit-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="audit-heading" className="font-semibold tracking-tight">
            AI recommendation vs. human decision <span className="font-normal text-muted-foreground tnum">({audit.totalItems})</span>
          </h2>
          <nav aria-label="Filter decisions" className="flex gap-1.5 overflow-x-auto pb-1">
            {FILTERS.map((f, i) => (
              <Link
                key={f.label}
                href={hrefWith({ filter: i ? f.label : undefined, page: undefined })}
                aria-current={i === filterIndex ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  i === filterIndex ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/70 text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className={panel}>
          {items.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-semibold">No AI decisions match.</p>
              <p className="mt-1 text-sm text-muted-foreground">Recommendations appear here once a request has been submitted and analysed.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/80">
              {items.map((row) => {
                const ai = row.analysis;
                const disagreed = row.override === true;
                return (
                  <li key={ai.id}>
                    <Link href={`/requests/${encodeURIComponent(row.requestId)}`} className="grid gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-card sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <span className="min-w-0">
                        <span className="block font-semibold tnum">{row.requestId}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {ai.modelVersion}, analysed {dateTime(ai.analysedAt)}, <span className={riskTone[ai.riskLevel]}>{humanize(ai.riskLevel)} risk</span>
                        </span>
                        {disagreed && row.overrideReason && <span className="mt-1 block truncate text-xs text-warn">Reason given: {row.overrideReason}</span>}
                      </span>
                      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="inline-flex items-center gap-1 rounded-full bg-ai/10 px-2 py-0.5 text-xs font-semibold text-ai">
                          <Bot className="size-3" aria-hidden />
                          <span className="sr-only">AI recommended </span>
                          {humanize(ai.recommendation)} <span className="font-normal tnum">{pct(ai.confidence)}%</span>
                        </span>
                        {row.humanDecision ? (
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", disagreed ? "bg-warn/12 text-warn" : "bg-ok/12 text-ok")}>
                            <span className="sr-only">Human decided </span>
                            {decisionLabel[row.humanDecision]}
                            {row.decidedBy ? `, ${row.decidedBy.name}` : ""}
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">No human decision yet</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {lastPage > 0 && (
          <nav aria-label="Pages" className="flex items-center justify-between text-sm">
            {page > 0 ? <Link href={hrefWith({ page: page - 1 })} className="font-medium text-primary">Previous</Link> : <span />}
            <span className="text-muted-foreground tnum">Page {page + 1} of {lastPage + 1}</span>
            {page < lastPage ? <Link href={hrefWith({ page: page + 1 })} className="font-medium text-primary">Next</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
