// Adapted from RewampUI "Word By Word Text" (MIT) https://github.com/palakonweb/Rewamp-UI
// Changes: text prop, flows inline with ordinary spaces so wrapping and alignment follow the surrounding heading,
// no accent colour on the last words, full text for screen readers, reduced motion renders plain text.
import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";

type Props = { text: string; className?: string; delay?: number; stagger?: number };

export function WordByWord({ text, className, delay = 0, stagger = 0.06 }: Props) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <Fragment key={i}>
            <motion.span
              className="inline-block"
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: delay + i * stagger, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 ? " " : ""}
          </Fragment>
        ))}
      </span>
    </span>
  );
}
