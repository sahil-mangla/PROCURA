"use client";

// Adapted from RewampUI "Typewriter Text" (MIT) https://github.com/palakonweb/Rewamp-UI
// Changes: text prop, no synchronous setState in the effect, start delay, reduced motion shows the full text, screen readers get the full text once
// instead of one character at a time, the caret stops blinking when typing ends, the full text is laid out invisibly underneath so the
// block never grows while typing, and new text starts from zero at once instead of flashing at the old length.
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

type Props = { text: string; speed?: number; startDelay?: number; className?: string; caretClassName?: string; onDone?: () => void };

export function Typewriter({ text, speed = 24, startDelay = 150, className, caretClassName = "text-ai", onDone }: Props) {
  const reduce = useReducedMotion();
  // The count belongs to the text it was typed for, so a new text reads as 0 until its own typing begins.
  const [typed, setTyped] = useState({ text, count: 0 });
  const count = typed.text === text ? typed.count : 0;
  const shown = reduce ? text.length : count;
  const done = shown >= text.length;

  useEffect(() => {
    if (reduce) return;
    let i = 0;
    let timer: ReturnType<typeof setInterval>;
    const begin = setTimeout(() => {
      timer = setInterval(() => {
        i += 1;
        setTyped({ text, count: i });
        if (i >= text.length) { clearInterval(timer); onDone?.(); }
      }, speed);
    }, startDelay);
    return () => { clearTimeout(begin); clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, startDelay, reduce]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="grid">
        <span className="invisible col-start-1 row-start-1">{text}</span>
        <span className="col-start-1 row-start-1">
          {text.slice(0, shown)}
          <span className={`${caretClassName} ${done ? "opacity-0" : "animate-pulse"}`}>|</span>
        </span>
      </span>
    </span>
  );
}
