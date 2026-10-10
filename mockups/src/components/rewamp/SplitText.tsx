// Adapted from RewampUI "Split Text Reveal" (MIT) https://github.com/palakonweb/Rewamp-UI
// Changes: text prop, words kept whole so lines never break mid-word, deterministic offsets,
// full text exposed to screen readers, reduced motion renders plain text.
import { motion, useReducedMotion } from "motion/react";

type Props = { text: string; className?: string; delay?: number; stagger?: number };

export function SplitText({ text, className, delay = 0, stagger = 0.03 }: Props) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;

  let i = 0;
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, w) => (
          <span key={w} className="inline-block whitespace-pre">
            {word.split("").map((ch) => {
              const n = i++;
              const dir = n % 2 === 0 ? -1 : 1;
              return (
                <motion.span
                  key={n}
                  className="inline-block"
                  initial={{ opacity: 0, y: dir * (16 + ((n * 7) % 18)), rotate: dir * (3 + ((n * 5) % 6)), filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, rotate: 0, filter: "blur(0px)" }}
                  transition={{ delay: delay + n * stagger, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  {ch}
                </motion.span>
              );
            })}
            {w < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </span>
  );
}
