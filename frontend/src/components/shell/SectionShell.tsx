import { Suspense } from "react";
import { AppShell, type Section } from "./AppShell";
import { UserMenu } from "./UserMenu";

/** App frame for one section. The user menu reads the session, so it streams in behind its own boundary. */
export function SectionShell({ section, children }: { section: Section; children: React.ReactNode }) {
  return (
    <AppShell
      section={section}
      headerActions={
        <Suspense fallback={<span className="h-8 w-32 animate-pulse rounded-md bg-muted/70" aria-hidden />}>
          <UserMenu />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
