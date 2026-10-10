"use client";

import { panel } from "@/components/ledger";

// Server errors arrive here without their details in production, so the copy stays general.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-4 sm:p-6">
      <section role="alert" className={`${panel} mx-auto max-w-lg p-6 text-center`}>
        <h2 className="text-lg font-semibold">This page could not load</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The server did not respond as expected. Your work is safe; nothing was changed. Try again, and if it keeps happening, tell your administrator
          {error.digest ? <> and quote <span className="tnum">{error.digest}</span></> : null}.
        </p>
        <button type="button" onClick={reset} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Try again
        </button>
      </section>
    </div>
  );
}
