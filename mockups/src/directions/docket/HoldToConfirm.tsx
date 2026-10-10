import { useRef } from "react";
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
  const fill = useTransform(progress, (v) => `${v * 100}%`);
  const run = useRef<AnimationPlaybackControls | null>(null);

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

  return (
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
      aria-description="Press and hold for about one second to confirm. Release to cancel."
      className="relative w-full touch-none overflow-hidden rounded-md border border-foreground/30 bg-secondary px-3 py-3 text-sm font-semibold select-none disabled:opacity-40"
    >
      <motion.span aria-hidden className={`absolute inset-y-0 left-0 ${toneClass[tone]}`} style={{ width: fill }} />
      <span className="relative mix-blend-normal">
        <span className="text-foreground">{disabled ? label : holdLabel}</span>
      </span>
    </button>
  );
}
