"use client";

// Adapted from Magic UI "Highlighter" (MIT) https://github.com/magicuidesign/magicui
// Changes: reduced motion draws the mark without animating, a start delay so it can follow another animation,
// the mark is decorative (aria-hidden) so screen readers read the text once, no scroll-into-view option.
import { useEffect, useLayoutEffect, useRef } from "react";
import { annotate } from "rough-notation";
import type { RoughAnnotation } from "rough-notation/lib/model";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Props = {
  children: React.ReactNode;
  action?: "highlight" | "underline" | "box" | "circle" | "strike-through" | "crossed-off" | "bracket";
  color?: string;
  strokeWidth?: number;
  /** Milliseconds the mark takes to draw. */
  animationDuration?: number;
  iterations?: number;
  padding?: number;
  multiline?: boolean;
  /** Milliseconds to wait before drawing. */
  delay?: number;
};

export function Highlighter({ children, action = "highlight", color = "#f4e04d", strokeWidth = 1.5, animationDuration = 600, iterations = 2, padding = 2, multiline = true, delay = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const annotation: RoughAnnotation = annotate(el, { type: action, color, strokeWidth, animationDuration, iterations, padding, multiline, animate: !reduce });
    // rough-notation redraws the mark itself when the text reflows, without replaying the draw animation.
    // (An extra hide()/show() observer here made the mark redraw from scratch on every layout change.)
    const timer = setTimeout(() => annotation.show(), reduce ? 0 : delay);
    // rough-notation's SVG carries no meaning; keep it away from assistive tech. It is inserted beside the
    // element, before it for a highlight and after it for every other type.
    const svg = action === "highlight" ? el.previousElementSibling : el.nextElementSibling;
    svg?.setAttribute("aria-hidden", "true");
    return () => {
      clearTimeout(timer);
      annotation.remove();
    };
  }, [action, color, strokeWidth, animationDuration, iterations, padding, multiline, delay]);

  return (
    <span ref={ref} className="relative inline-block bg-transparent">
      {children}
    </span>
  );
}
