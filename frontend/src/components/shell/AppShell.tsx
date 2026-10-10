"use client";

import { FileText, LayoutList } from "lucide-react";
import { DashboardShell, type DashboardShellNavSection } from "./dashboard-shell";

// Only screens that exist are listed. Add Budgets, Purchase orders, Notifications and AI performance as they are built.
const NAV: DashboardShellNavSection[] = [
  {
    id: "work",
    title: "Work",
    items: [
      { id: "requests", label: "Requests", icon: FileText, href: "/requests" },
      { id: "reviews", label: "Needs review", icon: LayoutList, href: "/reviews" },
    ],
  },
];

export type Section = "requests" | "reviews";

const TITLES: Record<Section, string> = { requests: "Requests", reviews: "Needs review" };

/** The Ledger app frame: sidebar navigation, header, and the page inside. */
// Each section's layout passes its own name, so the frame never reads the URL and can prerender (Cache Components).
export function AppShell({ section, headerActions, children }: { section: Section; headerActions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <DashboardShell
      brand={{ name: "Procura", description: "Approvals" }}
      navigation={NAV}
      activeItemId={section}
      title={TITLES[section]}
      headingLevel={1}
      headerActions={headerActions}
      className="min-h-screen"
    >
      {children}
    </DashboardShell>
  );
}
