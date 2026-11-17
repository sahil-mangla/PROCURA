"use client";

import { Bot, FileText, LayoutList } from "lucide-react";
import { DashboardShell, type DashboardShellNavSection } from "./dashboard-shell";


export type Section = "requests" | "reviews" | "notifications" | "purchase-orders" | "ai";

const TITLES: Record<Section, string> = { requests: "Requests", reviews: "Needs review", notifications: "Notifications", "purchase-orders": "Purchase order", ai: "AI oversight" };

export function AppShell({
  section,
  headerActions,
  children,
  reviewCount,
}: {
  section: Section;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  reviewCount?: number;
}) {
  const nav: DashboardShellNavSection[] = [
    {
      id: "work",
      title: "Work",
      items: [
        { id: "requests", label: "Requests", icon: FileText, href: "/requests" },
        { id: "reviews", label: "Needs review", icon: LayoutList, href: "/reviews", count: reviewCount },
      ],
    },
    {
      id: "insight",
      title: "Insight",
      items: [{ id: "ai", label: "AI oversight", icon: Bot, href: "/ai" }],
    },
  ];

  return (
    <DashboardShell
      brand={{ name: "Procura", description: "Approvals" }}
      navigation={nav}
      activeItemId={section}
      title={TITLES[section]}
      headingLevel={1}
      headerActions={headerActions}
      className="h-dvh"
    >
      {children}
    </DashboardShell>
  );
}
