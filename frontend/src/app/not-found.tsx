import Link from "next/link";
import { panel } from "@/components/ledger";

export default function RootNotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className={`${panel} w-full max-w-sm p-6 text-center`}>
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">There is nothing at this address.</p>
        <Link href="/requests" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Back to requests
        </Link>
      </section>
    </main>
  );
}
