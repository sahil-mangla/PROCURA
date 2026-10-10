// Adapted from RewampUI "Magnetic Pill Navbar" (MIT) https://github.com/palakonweb/Rewamp-UI
// Changes: router links, items as props, the pill follows the pointer ("magnetic") and returns to the active item,
// dark and light tones, aria-current, keyboard focus also moves the pill.
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";

export type NavItem = { id: string; label: string; to?: string; onClick?: () => void; disabled?: boolean };

const tones = {
  dark: {
    bar: "bg-white/[0.07] border-white/12 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl",
    pill: "bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
    on: "text-white",
    off: "text-white/55",
  },
  light: {
    bar: "bg-white/75 border-black/10 shadow-[0_12px_30px_-10px_rgba(31,42,51,0.35)] backdrop-blur-xl",
    pill: "bg-[#1f2a33] shadow-[0_2px_8px_rgba(0,0,0,0.25)]",
    on: "text-white",
    off: "text-neutral-600",
  },
} as const;

export function MagneticPillNav({ items, activeId, tone = "dark", label = "Mockups", className = "" }: { items: NavItem[]; activeId: string; tone?: keyof typeof tones; label?: string; className?: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const t = tones[tone];
  const lit = hovered ?? activeId;

  return (
    <nav aria-label={label} className={`relative inline-flex max-w-full items-center overflow-x-auto rounded-full border p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${t.bar} ${className}`} onMouseLeave={() => setHovered(null)} onBlur={() => setHovered(null)}>
      {items.map((item) => {
        const isLit = lit === item.id;
        const cls = `relative z-10 rounded-full px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors duration-300 min-[420px]:px-4 sm:px-5 ${isLit ? t.on : t.off} ${item.disabled ? "opacity-40" : ""}`;
        const inner = (
          <>
            {isLit && (
              <motion.span
                layoutId={`pill-${label}`}
                className={`absolute inset-0 -z-10 rounded-full ${t.pill}`}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
              />
            )}
            <span className="relative">{item.label}</span>
          </>
        );
        const common = { onMouseEnter: () => !item.disabled && setHovered(item.id), onFocus: () => !item.disabled && setHovered(item.id), className: cls } as const;
        return item.to ? (
          <Link key={item.id} to={item.to} aria-current={item.id === activeId ? "page" : undefined} {...common}>{inner}</Link>
        ) : (
          <button key={item.id} type="button" disabled={item.disabled} onClick={item.onClick} {...common}>{inner}</button>
        );
      })}
    </nav>
  );
}
