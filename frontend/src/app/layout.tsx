import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import { Backdrop } from "@/components/Backdrop";
import "./globals.css";

// Self-hosted by Next with a size-matched fallback, so text does not jump when the font arrives and no render-blocking stylesheet is fetched.
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });

export const metadata: Metadata = {
  title: { template: "%s · Procura", default: "Procura" },
  description: "Procurement requests and approvals, with AI decision support.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`h-full antialiased font-sans ${publicSans.variable}`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <Backdrop />
        {children}
      </body>
    </html>
  );
}
