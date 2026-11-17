import { SectionShell } from "@/components/shell/SectionShell";

export default function Layout({ children }: LayoutProps<"/reviews">) {
  return <SectionShell section="reviews">{children}</SectionShell>;
}
