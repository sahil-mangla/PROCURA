import { SectionShell } from "@/components/shell/SectionShell";

export default function Layout({ children }: LayoutProps<"/purchase-orders">) {
  return <SectionShell section="purchase-orders">{children}</SectionShell>;
}
