import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Search } from "lucide-react";
import { panel, StatusPill } from "@/components/ledger";
import { api, unwrap } from "@/lib/api/server";
import type { RequestStatus } from "@/lib/api/types";
import { date, humanize, inr, riskTone } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Requests" };

const FILTERS: { label: string; status?: RequestStatus[]; needsMyAction?: boolean }[] = [
  { label: "All" },
  { label: "Needs my action", needsMyAction: true },
  { label: "In progress", status: ["SUBMITTED", "DEPARTMENT_APPROVED", "HUMAN_REVIEW", "INFO_REQUESTED"] },
  { label: "Approved", status: ["FINANCE_APPROVED", "PO_GENERATED"] },
  { label: "Rejected", status: ["REJECTED"] },
  { label: "Drafts", status: ["DRAFT"] },
];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  const params = await searchParams;
  const q = one(params.q).trim();
  const filterIndex = Math.max(0, FILTERS.findIndex((f) => f.label === one(params.filter)));
  const filter = FILTERS[filterIndex];
  const page = Math.max(0, Number(one(params.page)) || 0);

  const client = await api();
  const result = unwrap(
    await client.GET("/purchase-requests", {
      params: { query: { q: q || undefined, status: filter.status, needsMyAction: filter.needsMyAction, page, size: 20 } },
    }),
  );
  const items = result.items ?? [];
  const lastPage = Math.max(0, Math.ceil(result.totalItems / result.size) - 1);

  const hrefWith = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { q, filter: filterIndex ? filter.label : undefined, page: page || undefined, ...next };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && v !== 0) sp.set(k, String(v));
    const s = sp.toString();
    return s ? `/requests?${s}` : "/requests";
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter requests" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
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
        <form role="search" action="/requests" className="relative w-full lg:w-80">
          {filterIndex > 0 && <input type="hidden" name="filter" value={filter.label} />}
          <label htmlFor="q" className="sr-only">Search requests</label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input id="q" name="q" defaultValue={q} placeholder="Search ID, title or vendor" className="w-full rounded-full border border-input bg-card/90 py-2 pr-3 pl-9 text-sm" />
        </form>
      </div>

      <section className={panel} aria-label="Requests">
        {items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold">{q ? `No requests match "${q}".` : "No requests here yet."}</p>
            <p className="mt-1 text-sm text-muted-foreground">{q ? "Try an ID such as PR-1042, or clear the search." : "Requests you can see will appear here."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/80">
            {items.map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${encodeURIComponent(r.id)}`} className="grid gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-card sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold tracking-tight">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="tnum">{r.id}</span>, {r.departmentName}, {r.vendorName}
                      {r.category ? `, ${humanize(r.category)}` : ""}
                      {r.submittedAt ? `, submitted ${date(r.submittedAt)}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <StatusPill status={r.status} />
                    {r.aiRecommendation && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ai/10 px-2 py-0.5 font-semibold text-ai" title="AI recommendation">
                        <Bot className="size-3" aria-hidden />
                        <span className="sr-only">AI recommends </span>
                        {humanize(r.aiRecommendation)}
                        {r.riskLevel && <span className={cn("font-normal", riskTone[r.riskLevel])}>, {r.riskLevel.toLowerCase()} risk</span>}
                      </span>
                    )}
                  </span>
                  <span className="text-right font-semibold tnum sm:min-w-28">{inr(r.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lastPage > 0 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground tnum">
            Page {page + 1} of {lastPage + 1}, {result.totalItems} requests
          </span>
          <span className="flex gap-2">
            {page > 0 && <Link className="rounded-full border border-border bg-card/70 px-3 py-1.5" href={hrefWith({ page: page - 1 })}>Previous</Link>}
            {page < lastPage && <Link className="rounded-full border border-border bg-card/70 px-3 py-1.5" href={hrefWith({ page: page + 1 })}>Next</Link>}
          </span>
        </nav>
      )}
    </div>
  );
}
