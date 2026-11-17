import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RequestForm } from "@/components/request/RequestForm";
import { api, unwrap } from "@/lib/api/server";

export const metadata: Metadata = { title: "Edit request" };

export default async function EditRequestPage({ params }: PageProps<"/requests/[id]/edit">) {
  const id = decodeURIComponent((await params).id);
  const client = await api();
  const [r, vendors] = await Promise.all([
    client.GET("/purchase-requests/{id}", { params: { path: { id } } }).then(unwrap),
    client.GET("/vendors", { params: { query: {} } }).then(unwrap),
  ]);
  // The backend decides who may edit and when; anyone else is sent back to the read-only page.
  if (!r.allowedActions.includes("EDIT")) redirect(`/requests/${encodeURIComponent(id)}`);
  return (
    <RequestForm
      vendors={vendors}
      initial={{
        id: r.id,
        version: r.version,
        title: r.title,
        description: r.description ?? "",
        category: r.category ?? "",
        priority: r.priority ?? "NORMAL",
        vendorId: String(r.vendor.id),
        neededBy: r.neededBy ?? "",
        items: r.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: String(i.unitPrice) })),
      }}
    />
  );
}
