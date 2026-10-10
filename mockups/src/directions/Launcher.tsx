import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { MagneticPillNav } from "@/components/rewamp/MagneticPillNav";
import { WordByWord } from "@/components/rewamp/WordByWord";
import { Backdrop } from "./Backdrop";
import { NAV } from "./TopBar";
import { useBodyTheme } from "./useBodyTheme";

/** Each card previews its direction with a few shapes in that direction's own palette. */
const DIRECTIONS = [
  {
    to: "/ledger", name: "A. Ledger", line: "Dense and calm on ledger-green paper. Built to be read all day.",
    moment: "Recording a decision stamps the page and slides a row into the history.",
    preview: (
      <div className="flex h-full gap-2 bg-[#e4eee7] p-3">
        <div className="w-1/4 rounded-md bg-[#d5e3d9]" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-1/3 rounded-lg bg-gradient-to-br from-[#8fd1b9] to-[#efe6a6]" />
          <div className="flex-1 rounded-lg bg-[#f7fbf8] shadow-sm" />
        </div>
        <div className="w-1/3 rounded-lg bg-[#f7fbf8] shadow-sm"><div className="m-2 h-1.5 rounded bg-[#2a4c9b]" /></div>
      </div>
    ),
  },
  {
    to: "/trace", name: "B. Trace", line: "The request as a timeline. AI events in violet, people in amber.",
    moment: "Open any row for details. When a person overrides the AI, the two lanes split.",
    preview: (
      <div className="relative h-full bg-[#141b2b] p-3">
        <div className="absolute -top-6 -left-6 size-28 rounded-full bg-[#6a56e0]/60 blur-2xl" />
        <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-[#e8a33a]/40 blur-2xl" />
        <div className="absolute top-3 bottom-3 left-1/2 w-px bg-white/25" />
        <div className="absolute top-4 left-3 h-6 w-[40%] rounded-lg border border-[#a99bff]/50 bg-white/10" />
        <div className="absolute top-12 right-3 h-6 w-[40%] rounded-lg border border-[#f3b94d]/50 bg-white/10" />
        <div className="absolute top-20 right-3 h-6 w-[40%] rounded-lg border border-[#f3b94d]/50 bg-white/10" />
      </div>
    ),
  },
  {
    to: "/docket", name: "C. Docket", line: "Paper objects on a desk: a docket, a thermal receipt, ink stamps.",
    moment: "Hold to confirm, then a decision receipt feeds out of a printer slot.",
    preview: (
      <div className="relative h-full bg-gradient-to-br from-[#e6ecf0] to-[#aebcc7] p-3">
        <div className="absolute top-3 left-4 h-[80%] w-[52%] rounded-sm bg-[#fdfdfb] shadow-md"><div className="m-2 h-2 w-2/3 rounded bg-[#1f2a33]/80" /></div>
        <div className="absolute top-5 right-4 h-3 w-[30%] rounded-full bg-neutral-800" />
        <div className="absolute top-8 right-5 h-[55%] w-[27%] bg-[#f3f3ef] shadow" />
        <div className="absolute bottom-4 left-10 rotate-[-8deg] rounded border-2 border-[#d1342a] px-1 text-[9px] font-bold text-[#d1342a]">Rejected</div>
      </div>
    ),
  },
];

export default function Launcher() {
  useBodyTheme("theme-launcher", "Procurement design mockups");
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <Backdrop variant="launcher" />
      <div className="flex justify-center"><MagneticPillNav items={NAV} activeId="home" tone="light" /></div>
      <p className="mt-12 text-center text-sm text-neutral-600">Procurement approvals, request detail page</p>
      <h1 className="mx-auto mt-3 max-w-3xl text-center text-5xl leading-[1.02] font-semibold tracking-[-0.04em] text-neutral-900 sm:text-7xl"><WordByWord text="Three directions for one screen." delay={0.1} stagger={0.1} /></h1>
      <p className="mx-auto mt-5 max-w-xl text-center text-base text-neutral-700">
        Every page shows the same request, PR-1042, with the same mock data. Record a decision in each, and reject it to see how each one shows the AI and a person disagreeing.
      </p>
      <ul className="mt-14 grid gap-5 md:grid-cols-3">
        {DIRECTIONS.map((d) => (
          <li key={d.to}>
            <Link to={d.to} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_34px_60px_-30px_rgba(0,0,0,0.5)]">
              <div className="m-2 h-40 overflow-hidden rounded-2xl">{d.preview}</div>
              <div className="flex flex-1 flex-col px-5 pt-3 pb-5">
                <p className="flex items-center justify-between text-lg font-semibold tracking-tight text-neutral-900">
                  {d.name}
                  <ArrowUpRight className="size-5 text-neutral-500 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                </p>
                <p className="mt-1 text-sm text-neutral-600">{d.line}</p>
                <p className="mt-3 border-t border-black/10 pt-3 text-sm text-neutral-800">{d.moment}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/mix" className="group mt-5 flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white/75 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_34px_60px_-30px_rgba(0,0,0,0.5)] md:flex-row">
        <div className="m-2 flex h-40 gap-2 overflow-hidden rounded-2xl bg-[#e4eee7] p-3 md:h-auto md:w-72 md:shrink-0">
          <div className="w-1/5 rounded-md bg-[#d5e3d9]" />
          <div className="relative flex-1">
            <div className="h-1/4 rounded-lg bg-gradient-to-br from-[#8fd1b9] to-[#efe6a6]" />
            <div className="absolute top-[34%] bottom-0 left-1/2 w-px bg-[#8aa592]" />
            <div className="absolute top-[34%] left-0 h-5 w-[44%] rounded-md border border-[#2a4c9b]/50 bg-white/80" />
            <div className="absolute top-[56%] right-0 h-5 w-[44%] rounded-md border border-[#8f5a0a]/50 bg-white/80" />
            <div className="absolute right-0 bottom-0 h-[26%] w-[30%] bg-[#f3f3ef] shadow" />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-5 pt-2 pb-5 md:py-5">
          <p className="flex items-center justify-between text-lg font-semibold tracking-tight text-neutral-900">
            D. Mix <span className="ml-3 rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-semibold text-white">Chosen direction</span>
            <ArrowUpRight className="ml-auto size-5 text-neutral-500 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </p>
          <p className="mt-1 text-sm text-neutral-600">Ledger's frame and layout, Trace's timeline for the approval history, and Docket's printed receipt as the audit record.</p>
          <p className="mt-3 border-t border-black/10 pt-3 text-sm text-neutral-800">Open any history row for details, then record a decision and watch the receipt print.</p>
        </div>
      </Link>

      <p className="mt-10 text-center text-xs text-neutral-500">Mock data only. Decisions made here are not saved.</p>
    </main>
  );
}
