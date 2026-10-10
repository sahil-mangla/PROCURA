import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "ink" | "accent" | "danger" | "quiet";
  arrow?: boolean;
};

const tones = {
  ink: "bg-foreground text-background",
  accent: "bg-primary text-primary-foreground",
  danger: "bg-destructive text-white",
  quiet: "border border-foreground/15 bg-card/60 text-foreground backdrop-blur",
} as const;

/** Pill button with an arrow chip that slides on hover, in the style of the reference sites. */
export function PillButton({ tone = "ink", arrow = true, className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "group inline-flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5 text-sm font-semibold shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)] transition-[transform,box-shadow,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:shadow-[0_10px_22px_-10px_rgba(0,0,0,0.55)] active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        tones[tone],
        className,
      )}
    >
      <span>{children}</span>
      {arrow && (
        <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-white/90 text-neutral-900">
          <ArrowRight className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
        </span>
      )}
    </button>
  );
}
