import { SectionShell } from "@/components/shell/SectionShell";

export default function Layout({ children }: LayoutProps<"/ai">) {
  return <SectionShell section="ai">{children}</SectionShell>;
}
