import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, Info, ShieldAlert, X } from "lucide-react";
import { AI } from "@/data/mock-request";
import type { Decision } from "@/data/useReview";
import { Divergence } from "./trace/Divergence";

export type ToastData = { id: number; kind: "override" | "agree" | "info"; title: string; body: string };

const word = { APPROVE: "Approved", REJECT: "Rejected", REQUEST_INFO: "Info requested" } as const;

/** One place decides what a recorded decision says, so every page words it the same. */
export function buildDecisionToast(action: Decision): ToastData {
  const overrides = action !== "REQUEST_INFO" && action !== AI.recommendation;
  const id = Date.now();
  if (overrides) return { id, kind: "override", title: `${word[action]}. You overrode the AI.`, body: `AI recommended ${AI.recommendation.toLowerCase()} at ${AI.confidence}% confidence. Both are in the audit record.` };
  if (action === "REQUEST_INFO") return { id, kind: "info", title: "Information requested", body: "The requester has been asked to respond. Review resumes when they do." };
  return { id, kind: "agree", title: `${word[action]}.`, body: "Matches the AI recommendation. Next: finance approval." };
}

const tones = {
  dark: "border-white/14 bg-[#0f1830]/92 text-foreground shadow-[0_30px_60px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)]",
  light: "border-black/10 bg-white/92 text-foreground shadow-[0_28px_56px_-22px_rgba(31,42,51,0.55),inset_0_1px_0_rgba(255,255,255,0.9)]",
} as const;

/** A small, self-dismissing notification. It sits over the page and never changes layout. */
export function Toast({ toast, onClose, tone = "dark" }: { toast: ToastData | null; onClose: () => void; tone?: keyof typeof tones }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 6500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  const Icon = toast?.kind === "override" ? ShieldAlert : toast?.kind === "info" ? Info : CircleCheck;
  const tint = toast?.kind === "override" ? "text-destructive" : toast?.kind === "info" ? "text-warn" : "text-ok";
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role="status"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className={`fixed right-4 bottom-4 z-50 flex w-[min(25rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border p-3.5 pr-10 backdrop-blur-2xl sm:right-6 sm:bottom-6 ${tones[tone]}`}
        >
          <Icon className={`mt-0.5 size-5 shrink-0 ${tint}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] leading-tight font-semibold tracking-tight">{toast.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{toast.body}</p>
          </div>
          {toast.kind !== "info" && <Divergence compact override={toast.kind === "override"} aiLabel="" humanLabel="" />}
          <button type="button" onClick={onClose} aria-label="Dismiss notification" className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground">
            <X className="size-3.5" aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
