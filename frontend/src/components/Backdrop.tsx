"use client";

import { SoftAurora } from "./motion/SoftAurora";

/** Full-viewport ledger-green backdrop: mesh light, ruled lines, pastel aurora, grain. Purely decorative. */
export function Backdrop() {
  return (
    <div aria-hidden className="backdrop">
      <i className="blob b1" />
      <i className="blob b2" />
      <i className="blob b3" />
      <i className="rules" />
      <SoftAurora className="aurora" colors={["#7fcfb2", "#9fb8ee", "#efe6a6"]} intensity={0.55} />
      <i className="vignette" />
      <i className="grain" />
    </div>
  );
}
