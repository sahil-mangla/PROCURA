import { SectionShell } from "@/components/shell/SectionShell";

export default function Layout({ children }: LayoutProps<"/requests">) {
  return <SectionShell section="requests">{children}</SectionShell>;
}
