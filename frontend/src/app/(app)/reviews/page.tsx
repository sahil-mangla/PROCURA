import type { Metadata } from "next";
import Link from "next/link";
import { Bot } from "lucide-react";
import { panel } from "@/components/ledger";
import { api, unwrap } from "@/lib/api/server";
import { dateTime, humanize, inr, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Needs review" };

/** Finance managers' queue of requests waiting for a human review decision. */
export default async function ReviewsPage() {
  const client = await api();
  const { items = [] } = unwrap(await client.GET("/reviews", { params: { query: { status: "OPEN" } } }));

  return (
    <div className="p-4 sm:p-6">
      <section className={panel} aria-label="Open reviews">
        {items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold">No reviews waiting.</p>
            <p className="mt-1 text-sm text-muted-foreground">Requests that need a human review appear here after department approval.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/80">
            {items.map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${encodeURIComponent(r.requestId)}`} className="grid gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-card sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold tracking-tight">{r.requestTitle ?? r.requestId}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="tnum">{r.requestId}</span>, waiting since {dateTime(r.createdAt)}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.triggers.map((t) => (
                        <span key={t.source + t.code} className="rounded-full bg-warn/12 px-2 py-0.5 text-xs font-medium text-warn">
                          {t.text}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    {r.amount != null && <span className="font-semibold tnum">{inr(r.amount)}</span>}
                    {r.aiRecommendation && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ai/10 px-2 py-0.5 text-xs font-semibold text-ai">
                        <Bot className="size-3" aria-hidden />
                        <span className="sr-only">AI recommends </span>
                        {humanize(r.aiRecommendation)}
                        {r.aiConfidence != null && <span className="font-normal tnum">, {pct(r.aiConfidence)}%</span>}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
