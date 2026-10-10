// Adapted from RewampUI "Morph Search Capsule" (MIT) https://github.com/palakonweb/Rewamp-UI
// Changes: TypeScript, motion/react, explicit light or dark mode (no document sniffing), labelled input and clear
// button, Escape clears, ripples cleaned up, reduced motion skips the ripple.
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type Props = {
  placeholder?: string;
  onSearch?: (query: string) => void;
  mode?: "light" | "dark";
  label?: string;
  className?: string;
};

export function MorphSearchCapsule({ placeholder = "Search", onSearch, mode = "dark", label = "Search", className = "" }: Props) {
  const reduce = useReducedMotion();
  const [isActive, setIsActive] = useState(false);
  const [query, setQuery] = useState("");
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = mode === "dark";

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && !query) setIsActive(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [query]);

  const update = (v: string) => { setQuery(v); onSearch?.(v); };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!reduce) {
      const r = e.currentTarget.getBoundingClientRect();
      const id = Date.now();
      setRipples((p) => [...p.slice(-2), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
      setTimeout(() => setRipples((p) => p.filter((x) => x.id !== id)), 600);
    }
    setIsActive(true);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const th = isDark
    ? { capsule: "bg-white/[0.08] border-white/14 text-white backdrop-blur-xl", shadow: "0 14px 34px -10px rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.3)", inner: "inset 0 1px 1px 0 rgba(255,255,255,0.18), inset 0 -1px 1px 0 rgba(0,0,0,0.35)", icon: "#FFFFFF", ripple: "rgba(255,255,255,0.2)", ph: "placeholder:text-white/45", clear: "bg-white/10 text-white" }
    : { capsule: "bg-white/80 border-black/10 text-[#18181B] backdrop-blur-xl", shadow: "0 12px 30px -8px rgba(31,42,51,0.3), 0 4px 12px rgba(0,0,0,0.04)", inner: "inset 0 1px 1.5px 0 rgba(255,255,255,1), inset 0 -1px 1px 0 rgba(0,0,0,0.04)", icon: "#18181B", ripple: "rgba(0,0,0,0.08)", ph: "placeholder:text-neutral-500", clear: "bg-black/10 text-black" };

  const caret = isActive && !query;

  return (
    <div ref={containerRef} role="search" className={`relative flex items-center justify-center select-none ${className}`}>
      <motion.div
        onClick={onClick}
        animate={{ scale: isActive ? 1.018 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className={`relative z-10 flex h-[46px] w-[210px] cursor-pointer items-center overflow-hidden rounded-full border pr-4 pl-3.5 transition-[width,colors] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring sm:w-[250px] ${isActive ? "sm:w-[300px]" : ""} ${th.capsule}`}
        style={{ boxShadow: th.shadow }}
      >
        <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: th.inner }} />
        {ripples.map((r) => (
          <motion.span key={r.id} initial={{ scale: 0, opacity: 0.7 }} animate={{ scale: 2.8, opacity: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}
            className="pointer-events-none absolute rounded-full" style={{ left: r.x - 30, top: r.y - 30, width: 60, height: 60, backgroundColor: th.ripple }} />
        ))}

        <div className="relative mr-2 flex size-6 shrink-0 items-center justify-center" aria-hidden>
          <svg viewBox="0 0 24 24" className="size-6 overflow-visible" fill="none">
            {/* The lens shrinks away while a cursor line grows in its place and blinks. */}
            <motion.circle cx="11" cy="11" r="6.5" stroke={th.icon} strokeWidth="2.4" strokeLinecap="round" style={{ transformOrigin: "11px 11px" }}
              animate={caret ? { opacity: 0, scale: 0.2 } : { opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 26, mass: 0.8 }} />
            <motion.line x1="11" x2="11" stroke={th.icon} strokeWidth="2.2" strokeLinecap="round"
              animate={caret ? { y1: 4, y2: 18, opacity: reduce ? 1 : [1, 1, 0, 0, 1] } : { y1: 11, y2: 11, opacity: 0 }}
              transition={caret
                ? { y1: { type: "spring", stiffness: 380, damping: 26 }, y2: { type: "spring", stiffness: 380, damping: 26 }, opacity: reduce ? { duration: 0.15 } : { repeat: Infinity, duration: 1.0, delay: 0.3, ease: "easeInOut", times: [0, 0.45, 0.5, 0.95, 1] } }
                : { duration: 0.15 }} />
            <motion.line stroke={th.icon} strokeWidth="2.4" strokeLinecap="round"
              animate={caret ? { x1: 15.5, y1: 15.5, x2: 15.5, y2: 15.5, opacity: 0 } : { x1: 15.8, y1: 15.8, x2: 20.8, y2: 20.8, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }} />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          role="searchbox"
          aria-label={label}
          value={query}
          onChange={(e) => update(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") { update(""); (e.target as HTMLInputElement).blur(); setIsActive(false); } }}
          onBlur={(e) => { if (!containerRef.current?.contains(e.relatedTarget as Node) && !query) setIsActive(false); }}
          onFocus={() => setIsActive(true)}
          placeholder={isActive ? "" : placeholder}
          style={{ caretColor: query ? th.icon : "transparent" }}
          className={`h-full min-w-0 flex-1 cursor-text bg-transparent text-[14px] font-medium outline-none focus-visible:outline-none ${th.ph}`}
        />

        {query && (
          <button type="button" aria-label="Clear search" onClick={(e) => { e.stopPropagation(); update(""); inputRef.current?.focus(); }}
            className={`flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs opacity-70 transition-opacity hover:opacity-100 ${th.clear}`}>
            <span aria-hidden>×</span>
          </button>
        )}
      </motion.div>
    </div>
  );
}
