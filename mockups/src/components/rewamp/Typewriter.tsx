// Adapted from RewampUI "Typewriter Text" (MIT) https://github.com/palakonweb/Rewamp-UI
// Changes: text prop, start delay, reduced motion shows the full text, screen readers get the full text once
// instead of one character at a time, the caret stops blinking when typing ends.
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

type Props = { text: string; speed?: number; startDelay?: number; className?: string; caretClassName?: string; onDone?: () => void };

export function Typewriter({ text, speed = 24, startDelay = 150, className, caretClassName = "text-ai", onDone }: Props) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? text.length : 0);
  const done = count >= text.length;

  useEffect(() => {
    if (reduce) { setCount(text.length); return; }
    setCount(0);
    let i = 0;
    let timer: ReturnType<typeof setInterval>;
    const begin = setTimeout(() => {
      timer = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length) { clearInterval(timer); onDone?.(); }
      }, speed);
    }, startDelay);
    return () => { clearTimeout(begin); clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, startDelay, reduce]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, count)}
        <span className={`${caretClassName} ${done ? "opacity-0" : "animate-pulse"}`}>|</span>
      </span>
    </span>
  );
}
