import { motion, useReducedMotion } from "motion/react";
import { AI, REQUEST } from "@/data/mock-request";

type Props = { action: "APPROVE" | "REJECT" | "REQUEST_INFO"; reason: string; reviewer: string; override: boolean };

const word = { APPROVE: "Approve", REJECT: "Reject", REQUEST_INFO: "Request info" } as const;

// Paper feeds out continuously: a gentle start, a long even glide, a soft stop. No stepping.
const FEED = [0.45, 0.05, 0.2, 1] as const;
const TORN =
  "polygon(0 0,100% 0,100% calc(100% - 9px),96% 100%,92% calc(100% - 9px),88% 100%,84% calc(100% - 9px),80% 100%,76% calc(100% - 9px),72% 100%,68% calc(100% - 9px),64% 100%,60% calc(100% - 9px),56% 100%,52% calc(100% - 9px),48% 100%,44% calc(100% - 9px),40% 100%,36% calc(100% - 9px),32% 100%,28% calc(100% - 9px),24% 100%,20% calc(100% - 9px),16% 100%,12% calc(100% - 9px),8% 100%,4% calc(100% - 9px),0 100%)";

/** A decision receipt: the audit record, fed out of a printer slot. */
export function Receipt({ action, reason, reviewer, override }: Props) {
  const reduce = useReducedMotion();
  const rows: [string, string][] = [
    ["Request", REQUEST.id],
    ["AI model", AI.modelVersion],
    ["AI said", `${AI.recommendation} ${AI.confidence}%`],
    ["Reviewer", reviewer],
    ["Decided", word[action]],
    ["Override", override ? "YES" : "No"],
  ];
  return (
    <div className="relative" data-receipt>
      {/* The slot sits above the paper so the receipt emerges from underneath its lip. */}
      <div className="relative z-20 mx-auto h-[18px] rounded-full bg-gradient-to-b from-neutral-700 to-neutral-950 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]">
        <span className="absolute inset-x-3 bottom-[3px] h-[3px] rounded-full bg-black shadow-[0_1px_0_rgba(255,255,255,0.12)]" aria-hidden />
      </div>
      <div className="relative z-10 -mt-[7px] overflow-hidden px-4 pt-2 pb-3">
        {/* shade under the lip */}
        <span className="pointer-events-none absolute inset-x-4 top-2 z-20 h-3 bg-gradient-to-b from-black/25 to-transparent" aria-hidden />
        <motion.div
          initial={reduce ? false : { y: "-101%", rotate: -0.4 }}
          animate={{ y: "0%", rotate: 0, x: reduce ? 0 : [0, 0.8, -0.6, 0.4, 0] }}
          transition={{
            y: { duration: 2.6, ease: FEED },
            rotate: { duration: 2.6, ease: FEED },
            x: { duration: 2.6, ease: "easeInOut", times: [0, 0.25, 0.55, 0.8, 1] },
          }}
          className="relative bg-gradient-to-b from-[#f9f9f5] to-[#eeeee7] px-4 pt-5 pb-9 font-mono text-[13px] leading-6 text-[#1f2a33] shadow-[0_8px_16px_-10px_rgba(0,0,0,0.6)]"
          style={{ clipPath: TORN, willChange: "transform" }}
          role="group"
          aria-label="Decision receipt"
          data-paper
        >
          <p className="font-bold">Decision receipt</p>
          <p aria-hidden className="text-[#9aa3a9]">- - - - - - - - - - - - - - -</p>
          <dl>
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-[#55636d]">{k}</dt>
                <dd className={k === "Override" && override ? "bg-[linear-gradient(transparent_45%,#f4e04d_45%)] font-bold" : ""}>{v}</dd>
              </div>
            ))}
          </dl>
          {reason && (
            <>
              <p aria-hidden className="text-[#9aa3a9]">- - - - - - - - - - - - - - -</p>
              <p className="text-[#55636d]">Reason</p>
              <p>{reason}</p>
            </>
          )}
          <p aria-hidden className="text-[#9aa3a9]">- - - - - - - - - - - - - - -</p>
          <p className="text-[#55636d]">Recorded just now</p>
        </motion.div>
      </div>
    </div>
  );
}
