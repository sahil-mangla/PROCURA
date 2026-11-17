import { panel } from "@/components/ledger";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-9 w-72 max-w-full animate-pulse rounded-full bg-card/70" aria-hidden />
      <div className={`${panel} space-y-3 p-5`} aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl bg-muted/70" />
        ))}
      </div>
    </div>
  );
}
