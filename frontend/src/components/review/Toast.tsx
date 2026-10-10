"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, Info, ShieldAlert, TriangleAlert, X } from "lucide-react";
import type { HumanDecision, Recommendation } from "@/lib/api/types";
import { pct } from "@/lib/format";
import { Divergence } from "./Divergence";

export type ToastData = { id: number; kind: "override" | "agree" | "info" | "error"; title: string; body: string };

const word = { APPROVE: "Approved", REJECT: "Rejected" } as const;

/**
 * One place decides what a recorded decision says, so every page words it the same
 * (design rule: same wording on every page, matching the backend events).
 */
export function buildDecisionToast(decision: HumanDecision, ai: { recommendation: Recommendation; confidence: number } | null): ToastData {
  const id = Date.now();
  if (decision === "REQUEST_INFORMATION") {
    return { id, kind: "info", title: "Information requested", body: "The requester has been asked to respond. Review resumes when they resubmit." };
  }
  if (ai && decision !== ai.recommendation) {
    return { id, kind: "override", title: `${word[decision]}. You overrode the AI.`, body: `AI recommended ${ai.recommendation.toLowerCase()} at ${pct(ai.confidence)}% confidence. Both are in the audit record.` };
  }
  return { id, kind: "agree", title: `${word[decision]}.`, body: ai ? "Matches the AI recommendation." : "No AI recommendation was available. Your decision is recorded." };
}

/** A small, self-dismissing notification. It sits over the page and never changes layout. */
export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 6500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  const Icon = toast?.kind === "override" ? ShieldAlert : toast?.kind === "info" ? Info : toast?.kind === "error" ? TriangleAlert : CircleCheck;
  const tint = toast?.kind === "override" || toast?.kind === "error" ? "text-destructive" : toast?.kind === "info" ? "text-warn" : "text-ok";
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role={toast.kind === "error" ? "alert" : "status"}
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed right-4 bottom-4 z-50 flex w-[min(25rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-black/10 bg-white/92 p-3.5 pr-10 text-foreground shadow-[0_28px_56px_-22px_rgba(31,42,51,0.55),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:right-6 sm:bottom-6"
        >
          <Icon className={`mt-0.5 size-5 shrink-0 ${tint}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-tight font-semibold tracking-tight">{toast.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{toast.body}</p>
          </div>
          {(toast.kind === "override" || toast.kind === "agree") && <Divergence compact override={toast.kind === "override"} aiLabel="" humanLabel="" />}
          <button type="button" onClick={onClose} aria-label="Dismiss notification" className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground">
            <X className="size-3.5" aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
