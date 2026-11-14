import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Row, Section } from "@/components/ledger";
import { api, unwrap } from "@/lib/api/server";
import { dateTime, inr } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/purchase-orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Purchase order ${decodeURIComponent(id)}` };
}

export default async function PurchaseOrderPage({ params }: PageProps<"/purchase-orders/[id]">) {
  const id = decodeURIComponent((await params).id);
  const client = await api();
  const result = await client.GET("/purchase-orders/{id}", { params: { path: { id } } });
  // Same page for "forbidden" as for "missing", so it does not reveal which orders exist.
  if (result.response.status === 403) notFound();
  const po = unwrap(result);

  return (
    <div className="mx-auto grid max-w-3xl gap-6 p-4 sm:p-6">
      <Section title={`Purchase order ${po.id}`}>
        <dl>
          <Row label="Request">
            <Link href={`/requests/${encodeURIComponent(po.purchaseRequestId)}`} className="tnum underline underline-offset-4">{po.purchaseRequestId}</Link>
          </Row>
          <Row label="Vendor">{po.vendor.name}</Row>
          {po.departmentName && <Row label="Department">{po.departmentName}</Row>}
          <Row label="Issued">{dateTime(po.issuedAt)}</Row>
          {po.approvedBy && po.approvedBy.length > 0 && <Row label="Approved by">{po.approvedBy.map((a) => a.name).join(", ")}</Row>}
          <Row label="Total"><span className="text-base tnum">{inr(po.total)}</span></Row>
        </dl>
        <ul className="mt-2 mb-2 divide-y divide-border/80 border-t border-border/80 text-sm">
          {po.items.map((i, n) => (
            <li key={i.id ?? n} className="flex justify-between gap-3 py-2">
              <span>{i.quantity} x {i.description}</span>
              <span className="tnum">{inr(i.lineTotal ?? i.quantity * i.unitPrice)}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
