import { useState } from "react";
import { SoftAurora } from "@/components/rewamp/SoftAurora";

type Variant = "trace" | "ledger" | "docket" | "launcher";

const AURORA: Partial<Record<Variant, { colors: [string, string, string]; intensity: number; className: string }>> = {
  trace: { colors: ["#4fd1c5", "#5b8cff", "#b48cff"], intensity: 0.6, className: "aurora" },
  ledger: { colors: ["#7fcfb2", "#9fb8ee", "#efe6a6"], intensity: 0.55, className: "aurora aurora-soft" },
  launcher: { colors: ["#f2a7b3", "#9bb4f5", "#f1dc9a"], intensity: 0.6, className: "aurora aurora-soft" },
};

/**
 * Full-viewport imagery behind a direction. Procedural layers (blurred mesh light, grain, texture) always render.
 * A real image at public/bg/<variant>.webp or .jpg is laid over them when present (see public/bg/README.md).
 * Trace uses a photographic base with a WebGL soft aurora blended over it.
 */
export function Backdrop({ variant }: { variant: Variant }) {
  const exts = variant === "trace" ? ["webp", "jpg"] : ["jpg", "webp"];
  const [extIndex, setExtIndex] = useState(0);
  const photo = extIndex < exts.length ? `/bg/${variant}.${exts[extIndex]}` : null;
  const isTrace = variant === "trace";

  return (
    <div aria-hidden className={`backdrop backdrop-${variant}`}>
      {!isTrace && (<><i className="blob b1" /><i className="blob b2" /><i className="blob b3" /></>)}
      {variant === "docket" && (<><i className="shaft s1" /><i className="shaft s2" /><i className="shaft s3" /></>)}
      {variant === "ledger" && <i className="rules" />}
      {!isTrace && variant !== "docket" && <i className="dots" />}
      {photo && <img className="photo" src={photo} alt="" onError={() => setExtIndex((i) => i + 1)} />}
      {isTrace && <i className="trace-shade" />}
      {AURORA[variant] && <SoftAurora className={AURORA[variant]!.className} colors={AURORA[variant]!.colors} intensity={AURORA[variant]!.intensity} />}
      <i className="vignette" />
      <i className="grain" />
    </div>
  );
}
