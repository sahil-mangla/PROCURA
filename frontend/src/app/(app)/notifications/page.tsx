import type { Metadata } from "next";
import Link from "next/link";
import { panel } from "@/components/ledger";
import { markNotificationRead } from "@/lib/actions";
import { api, unwrap } from "@/lib/api/server";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const client = await api();
  const { items = [] } = unwrap(await client.GET("/notifications"));

  return (
    <div className="p-4 sm:p-6">
      <section className={panel} aria-label="Notifications">
        {items.length === 0 ? (
          <p className="px-6 py-14 text-center font-semibold">No notifications.</p>
        ) : (
          <ul className="divide-y divide-border/80">
            {items.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className={n.read ? "text-muted-foreground" : "font-semibold"}>{n.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateTime(n.createdAt)},{" "}
                    <Link href={`/requests/${encodeURIComponent(n.requestId)}`} className="tnum underline underline-offset-4">{n.requestId}</Link>
                  </p>
                </div>
                {!n.read && (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <button type="submit" className="rounded-full border border-foreground/15 bg-card/70 px-3 py-1 text-xs font-semibold">Mark read</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
