"use client";

import { SoftAurora } from "./motion/SoftAurora";

// Module-level so the aurora's effect (which depends on the array) does not restart whenever Backdrop re-renders.
const AURORA_COLORS: [string, string, string] = ["#7fcfb2", "#9fb8ee", "#efe6a6"];

/** Full-viewport ledger-green backdrop: mesh light, ruled lines, pastel aurora, grain. Purely decorative. */
export function Backdrop() {
  return (
    <div aria-hidden className="backdrop">
      <i className="blob b1" />
      <i className="blob b2" />
      <i className="blob b3" />
      <i className="rules" />
      <SoftAurora className="aurora" colors={AURORA_COLORS} intensity={0.55} />
      <i className="vignette" />
      <i className="grain" />
    </div>
  );
}
