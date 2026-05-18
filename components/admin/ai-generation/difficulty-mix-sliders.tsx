"use client";

import type { Difficulty } from "@/types/api";

/**
 * Three difficulty sliders (easy/medium/hard) that always sum to 100.
 * Moving one auto-redistributes the remainder proportionally across the other
 * two — if they're both zero, the remainder goes to the next in priority
 * order. Simple enough, avoids UX surprise where the sum suddenly breaks.
 */
interface Props {
  value: Record<Difficulty, number>;
  onChange: (v: Record<Difficulty, number>) => void;
  disabled?: boolean;
}

const TONE: Record<Difficulty, string> = {
  easy: "accent-emerald-500",
  medium: "accent-amber-500",
  hard: "accent-rose-500",
};

export function DifficultyMixSliders({ value, onChange, disabled }: Props) {
  const setOne = (key: Difficulty, next: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(next)));
    const others = (["easy", "medium", "hard"] as const).filter((k) => k !== key);
    const remaining = 100 - clamped;
    const [a, b] = others;
    const othersSum = value[a] + value[b];

    let aNext: number;
    let bNext: number;
    if (othersSum === 0) {
      aNext = Math.round(remaining / 2);
      bNext = remaining - aNext;
    } else {
      aNext = Math.round((value[a] / othersSum) * remaining);
      bNext = remaining - aNext;
    }
    onChange({ [key]: clamped, [a]: aNext, [b]: bNext } as Record<
      Difficulty,
      number
    >);
  };

  return (
    <div className="space-y-2">
      {(["easy", "medium", "hard"] as const).map((k) => (
        <div key={k} className="flex items-center gap-2">
          <div className="w-14 text-xs capitalize text-slate-600">{k}</div>
          <input
            type="range"
            aria-label={`${k} percentage`}
            min={0}
            max={100}
            value={value[k]}
            disabled={disabled}
            onChange={(e) => setOne(k, Number(e.target.value))}
            className={`flex-1 ${TONE[k]} disabled:opacity-50`}
          />
          <div className="w-10 text-right text-xs font-semibold text-slate-900">
            {value[k]}%
          </div>
        </div>
      ))}
      <div className="text-right text-[11px] text-slate-400">
        Sum always 100%
      </div>
    </div>
  );
}
