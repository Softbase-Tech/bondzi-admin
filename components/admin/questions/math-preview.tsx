"use client";

import "katex/dist/katex.min.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

interface Props {
  source: string;
  className?: string;
  /** Compact mode: tighter typography for option-row inline previews. */
  compact?: boolean;
}

/**
 * Read-only Markdown + LaTeX renderer. Mirrors the right-hand preview in
 * math-editor.tsx so admins see the same KaTeX output a student would see in
 * the mobile app (the backend pre-renders to MathJax SVG; KaTeX HTML on the
 * web is visually equivalent for the WAEC/WASSCE math subset).
 */
export function MathPreview({ source, className, compact = false }: Props) {
  if (!source?.trim()) {
    return <span className="text-[12px] italic text-slate-400">—</span>;
  }
  return (
    <div
      className={cn(
        "prose max-w-none prose-p:my-1 text-slate-800",
        compact ? "prose-sm text-[13px]" : "prose-sm text-[14px]",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
