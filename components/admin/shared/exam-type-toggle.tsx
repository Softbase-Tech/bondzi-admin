"use client";

import { cn } from "@/lib/utils";
import type { ExamType } from "@/types/api";

interface Props {
  value: ExamType;
  onChange: (value: ExamType) => void;
  className?: string;
}

export function ExamTypeToggle({ value, onChange, className }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Exam type"
      className={cn(
        "inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-sm",
        className,
      )}
    >
      {(["bece", "wassce", "novdec"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-3 py-1.5 rounded-[5px] font-medium transition-colors",
            value === opt
              ? "bg-primary text-white"
              : "text-slate-600 hover:bg-slate-50",
          )}
        >
          {opt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
