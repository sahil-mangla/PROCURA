import type { Metadata } from "next";
import { RequestForm, emptyValues } from "@/components/request/RequestForm";
import { api, unwrap } from "@/lib/api/server";

export const metadata: Metadata = { title: "New request" };

export default async function NewRequestPage() {
  const client = await api();
  const vendors = unwrap(await client.GET("/vendors", { params: { query: {} } }));
  return <RequestForm initial={emptyValues} vendors={vendors} />;
}
