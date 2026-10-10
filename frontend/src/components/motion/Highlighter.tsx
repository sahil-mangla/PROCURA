"use client";

// Adapted from Magic UI "Highlighter" (MIT) https://github.com/magicuidesign/magicui
// Changes: reduced motion draws the mark without animating, a start delay so it can follow another animation,
// the mark is decorative (aria-hidden) so screen readers read the text once, no scroll-into-view option.
import { useLayoutEffect, useRef } from "react";
import { annotate } from "rough-notation";
import type { RoughAnnotation } from "rough-notation/lib/model";

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

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const annotation: RoughAnnotation = annotate(el, { type: action, color, strokeWidth, animationDuration, iterations, padding, multiline, animate: !reduce });
    // Redraw if the text reflows, otherwise the mark would sit where the words used to be.
    const resize = new ResizeObserver(() => {
      annotation.hide();
      annotation.show();
    });
    const timer = setTimeout(() => {
      annotation.show();
      resize.observe(el);
    }, reduce ? 0 : delay);
    // rough-notation's SVG carries no meaning; keep it away from assistive tech.
    const hideSvg = () => el.querySelectorAll("svg").forEach((s) => s.setAttribute("aria-hidden", "true"));
    const mo = new MutationObserver(hideSvg);
    mo.observe(el, { childList: true });
    return () => {
      clearTimeout(timer);
      resize.disconnect();
      mo.disconnect();
      annotation.remove();
    };
  }, [action, color, strokeWidth, animationDuration, iterations, padding, multiline, delay]);

  return (
    <span ref={ref} className="relative inline-block bg-transparent">
      {children}
    </span>
  );
}
