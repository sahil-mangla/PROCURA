import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import { Backdrop } from "@/components/Backdrop";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { template: "%s · Procura", default: "Procura" },
  description: "Procurement requests and approvals, with AI decision support.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${publicSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Backdrop />
        {children}
      </body>
    </html>
  );
}
