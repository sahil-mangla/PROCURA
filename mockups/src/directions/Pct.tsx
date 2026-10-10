import NumberFlow from "@number-flow/react";

/** Animated percentage for sighted users; screen readers get the whole number instead of loose digits. */
export function Pct({ value }: { value: number }) {
  return (
    <>
      <span aria-hidden>
        <NumberFlow value={value} suffix="%" />
      </span>
      <span className="sr-only">{value}%</span>
    </>
  );
}
