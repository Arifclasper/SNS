"use client";

export function QuantityStepper({
  value,
  onChange,
  max = 99,
  min = 1,
  compact = false,
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  compact?: boolean;
}) {
  const size = compact ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";

  return (
    <div className="inline-flex items-center overflow-hidden rounded-[6px] border border-line-strong bg-white">
      <button
        type="button"
        className={`${size} flex items-center justify-center text-ink-soft transition-colors hover:bg-raised disabled:opacity-40`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span
        className={`${compact ? "w-8" : "w-10"} text-center text-[13px] font-semibold tabular-nums`}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={`${size} flex items-center justify-center text-ink-soft transition-colors hover:bg-raised disabled:opacity-40`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
