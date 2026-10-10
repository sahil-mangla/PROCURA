import Link from "next/link";
import { panel } from "@/components/ledger";

export default function NotFound() {
  return (
    <div className="p-4 sm:p-6">
      <section className={`${panel} mx-auto max-w-lg p-6 text-center`}>
        <h2 className="text-lg font-semibold">Not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">This request does not exist, or you do not have access to it.</p>
        <Link href="/requests" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Back to requests
        </Link>
      </section>
    </div>
  );
}
