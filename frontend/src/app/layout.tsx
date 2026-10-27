import type { Metadata } from "next";
import { Backdrop } from "@/components/Backdrop";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s · Procura", default: "Procura" },
  description: "Procurement requests and approvals, with AI decision support.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className="h-full antialiased font-sans">
      <body className="min-h-full">
        <Backdrop />
        {children}
      </body>
    </html>
  );
}
