import { SectionShell } from "@/components/shell/SectionShell";

export default function Layout({ children }: LayoutProps<"/notifications">) {
  return <SectionShell section="notifications">{children}</SectionShell>;
}
