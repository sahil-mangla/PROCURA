import { RotateCcw } from "lucide-react";
import { MagneticPillNav } from "@/components/rewamp/MagneticPillNav";
import { MorphSearchCapsule } from "@/components/rewamp/MorphSearchCapsule";

export const NAV = [
  { id: "home", label: "All mockups", to: "/" },
  { id: "ledger", label: "Ledger", to: "/ledger" },
  { id: "trace", label: "Trace", to: "/trace" },
  { id: "docket", label: "Docket", to: "/docket" },
  { id: "mix", label: "Mix", to: "/mix" },
];

type Props = {
  activeId: "home" | "ledger" | "trace" | "docket" | "mix";
  tone: "dark" | "light";
  onSearch?: (query: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  onReset?: () => void;
  canReset?: boolean;
  className?: string;
};

/** The same top bar on every page: magnetic nav, optional search capsule, optional reset. */
export function TopBar({ activeId, tone, onSearch, searchLabel = "Search", searchPlaceholder = "Search", onReset, canReset = false, className = "" }: Props) {
  const dark = tone === "dark";
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 py-5 ${className}`}>
      <MagneticPillNav items={NAV} activeId={activeId} tone={tone} />
      <div className="flex items-center gap-2">
        {onSearch && <MorphSearchCapsule mode={tone} label={searchLabel} placeholder={searchPlaceholder} onSearch={onSearch} />}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            aria-label="Reset demo"
            title="Reset demo"
            className={`grid size-[46px] place-items-center rounded-full border backdrop-blur-xl transition-[opacity,background-color,transform] duration-300 enabled:active:scale-95 disabled:opacity-40 ${dark ? "border-white/14 bg-white/[0.08] text-white enabled:hover:bg-white/15" : "border-black/10 bg-white/75 text-[#1f2a33] shadow-[0_10px_24px_-10px_rgba(31,42,51,0.35)] enabled:hover:bg-white"}`}
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
