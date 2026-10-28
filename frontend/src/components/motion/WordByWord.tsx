// Adapted from RewampUI "Word By Word Text" (MIT) https://github.com/palakonweb/Rewamp-UI
// Changes: text prop, flows inline with ordinary spaces so wrapping and alignment follow the surrounding heading,
// no accent colour on the last words, full text for screen readers.
// Driven by CSS (.word-in in globals.css) rather than JS: the server HTML and the first client render are identical, so a
// reduced-motion setting cannot cause a hydration mismatch, and the words animate without waiting for the bundle to load.
// Reduced motion renders the words in place with no animation, from the same stylesheet rule.

type Props = { text: string; className?: string; delay?: number; stagger?: number };

export function WordByWord({ text, className, delay = 0, stagger = 0.06 }: Props) {
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <span key={i} className="inline-block">
            <span className="word-in" style={{ "--word-delay": `${delay + i * stagger}s` } as React.CSSProperties}>
              {word}
            </span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </span>
  );
}
