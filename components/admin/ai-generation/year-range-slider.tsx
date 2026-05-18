"use client";

/**
 * Dual-handle year-range slider. Two native <input type="range"> bound to the
 * same track, constrained so min ≤ max. Spec §3.1 explicitly calls for a dual
 * slider; number inputs aren't acceptable.
 */
interface Props {
  min: number;
  max: number;
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}

export function YearRangeSlider({ min, max, from, to, onChange }: Props) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className="select-none">
      <div className="flex items-baseline justify-between text-xs text-slate-600">
        <span>
          From <span className="font-semibold text-slate-900">{from}</span>
        </span>
        <span>
          To <span className="font-semibold text-slate-900">{to}</span>
        </span>
      </div>
      <div className="relative h-8">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent0"
          style={{ left: `${pct(from)}%`, right: `${100 - pct(to)}%` }}
        />
        <input
          type="range"
          aria-label="Year from"
          min={min}
          max={max}
          value={from}
          onChange={(e) => {
            const next = Math.min(Number(e.target.value), to);
            onChange(next, to);
          }}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow"
        />
        <input
          type="range"
          aria-label="Year to"
          min={min}
          max={max}
          value={to}
          onChange={(e) => {
            const next = Math.max(Number(e.target.value), from);
            onChange(from, next);
          }}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow"
        />
      </div>
    </div>
  );
}
