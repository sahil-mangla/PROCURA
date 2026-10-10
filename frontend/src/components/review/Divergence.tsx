"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

type Props = {
  /** True when the human decision differs from the AI recommendation. */
  override: boolean;
  aiLabel: string;
  humanLabel: string;
  /** Small glyph for toasts: no labels, cropped to the two lines. */
  compact?: boolean;
};

/**
 * The one orchestrated moment in this direction. Two lines leave the spine: the AI lane (violet) and the
 * people lane (amber). On an override they pull apart; when they agree they join into one line.
 * GSAP draws the strokes; reduced motion shows the finished drawing immediately.
 */
export function Divergence({ override, aiLabel, humanLabel, compact }: Props) {
  const root = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = root.current;
    if (!svg) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      const paths = gsap.utils.toArray<SVGPathElement>("path[data-draw]");
      const labels = gsap.utils.toArray<SVGGElement>("g[data-label] > g");
      if (reduce) {
        gsap.set(paths, { strokeDashoffset: 0 });
        if (labels.length) gsap.set(labels, { opacity: 1, y: 0 });
        return;
      }
      paths.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      if (labels.length) gsap.set(labels, { opacity: 0, y: 6 });
      const tl = gsap
        .timeline({ defaults: { ease: "power3.inOut" } })
        .to(paths, { strokeDashoffset: 0, duration: 1.1, stagger: 0.12 })
        ;
      if (labels.length) tl.to(labels, { opacity: 1, y: 0, duration: 0.35, stagger: 0.1, ease: "power2.out" }, "-=0.25");
    }, svg);
    return () => ctx.revert();
  }, [override]);

  const aiPath = override ? "M300 4 C300 70 130 70 130 140" : "M130 4 C130 70 300 70 300 140";
  const humanPath = override ? "M300 4 C300 70 470 70 470 140" : "M470 4 C470 70 300 70 300 140";

  return (
    <svg ref={root} viewBox={compact ? "100 0 400 150" : "0 0 600 190"} role={compact ? undefined : "img"} aria-hidden={compact ? true : undefined} aria-label={compact ? undefined : override ? `The lanes split: AI said ${aiLabel}, a person said ${humanLabel}.` : `The lanes join: AI and a person both said ${humanLabel}.`} className={compact ? "h-10 w-auto shrink-0 overflow-visible" : "mx-auto h-auto w-full max-w-xl overflow-visible"}>
      <path data-draw d={aiPath} fill="none" stroke="var(--ai)" strokeWidth={compact ? 10 : 3} strokeLinecap="round" />
      <path data-draw d={humanPath} fill="none" stroke="var(--human)" strokeWidth={compact ? 10 : 3} strokeLinecap="round" />
      {compact ? null : override ? (
        <>
          <g data-label transform="translate(130 156)"><g>
            <rect x="-70" y="0" width="140" height="30" rx="15" fill="var(--card)" stroke="var(--ai)" />
            <text x="0" y="20" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ai)">{aiLabel}</text>
          </g></g>
          <g data-label transform="translate(470 156)"><g>
            <rect x="-70" y="0" width="140" height="30" rx="15" fill="var(--card)" stroke="var(--human)" />
            <text x="0" y="20" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--human)">{humanLabel}</text>
          </g></g>
          <g data-label transform="translate(300 100)"><g>
            <text x="0" y="0" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">Overridden</text>
          </g></g>
        </>
      ) : (
        <g data-label transform="translate(300 156)"><g>
          <rect x="-80" y="0" width="160" height="30" rx="15" fill="var(--card)" stroke="var(--ok)" />
          <text x="0" y="20" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ok)">{humanLabel}, agreed</text>
        </g></g>
      )}
    </svg>
  );
}
