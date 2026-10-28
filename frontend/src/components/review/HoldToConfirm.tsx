"use client";

import { useEffect, useId, useRef } from "react";
import { animate, motion, useMotionValue, useTransform, type AnimationPlaybackControls } from "motion/react";

type Props = {
  label: string;
  holdLabel: string;
  disabled?: boolean;
  tone: "primary" | "destructive" | "neutral";
  onConfirm: () => void;
};

const toneClass = {
  primary: "bg-primary text-primary-foreground",
  destructive: "bg-destructive text-white",
  neutral: "bg-foreground text-card",
} as const;

/**
 * A press-and-hold button: the fill rises while held and the action only fires when it completes.
 * Letting go cancels. Space and Enter work too, so it is usable without a pointer.
 * Built from the idea behind dqnamo's "Hold to Confirm" (inspiration only; no code copied).
 */
export function HoldToConfirm({ label, holdLabel, disabled, tone, onConfirm }: Props) {
  const progress = useMotionValue(0);
  const clip = useTransform(progress, (v) => `inset(0 ${Math.max(0, 100 - v * 100)}% 0 0)`);
  const run = useRef<AnimationPlaybackControls | null>(null);
  const hintId = useId();

  const start = () => {
    if (disabled || run.current) return;
    run.current = animate(progress, 1, {
      duration: 1.1,
      ease: "linear",
      onComplete: () => {
        run.current = null;
        onConfirm();
      },
    });
  };
  const cancel = () => {
    if (!run.current) return;
    run.current.stop();
    run.current = null;
    animate(progress, 0, { duration: 0.25, ease: "easeOut" });
  };

  // The fill stays full while the action runs. If the server refuses it the button comes back enabled, so empty the fill to let it be held again.
  useEffect(() => {
    if (!disabled && !run.current) animate(progress, 0, { duration: 0.25, ease: "easeOut" });
  }, [disabled, progress]);

  const displayText = disabled ? label : holdLabel;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") cancel();
        }}
        onBlur={cancel}
        aria-describedby={hintId}
        className="relative flex w-full touch-none items-center justify-center overflow-hidden rounded-md border border-foreground/30 bg-secondary px-3 py-3 text-sm font-semibold select-none disabled:opacity-40"
      >
        <span className="text-foreground">{displayText}</span>
        <motion.span
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex items-center justify-center ${toneClass[tone]}`}
          style={{ clipPath: clip }}
        >
          {displayText}
        </motion.span>
      </button>
      <span id={hintId} className="sr-only">Press and hold for about one second to confirm. Release to cancel.</span>
    </>
  );
}
