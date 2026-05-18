"use client";

import { forwardRef, useRef, useImperativeHandle } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { ListOrdered, Underline } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Markdown + LaTeX editor.
 *
 * Source on the left, live KaTeX-rendered preview on the right. The toolbar
 * inserts the most common WAEC/WASSCE-shaped math snippets at the cursor.
 *
 * Server-side rendering uses MathJax SVG (see backend math.util.ts) — this
 * client-side preview uses KaTeX HTML purely so the admin sees what the
 * student will see without a round-trip. Both engines accept the same
 * LaTeX subset; differences in glyph shape are minor.
 */

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  /** Hide the toolbar for compact inline editors (e.g. option bodies). */
  compact?: boolean;
  id?: string;
}

interface Snippet {
  label: string;
  insert: string;
  /** Where to put the cursor inside the inserted snippet (relative offset). */
  cursorOffset?: number;
}

const SNIPPETS: Snippet[] = [
  { label: "x²", insert: "$x^2$", cursorOffset: 2 },
  { label: "xⁿ", insert: "$x^{n}$", cursorOffset: 4 },
  { label: "a⁄b", insert: "$\\frac{a}{b}$", cursorOffset: 7 },
  { label: "√x", insert: "$\\sqrt{x}$", cursorOffset: 7 },
  { label: "±", insert: "$\\pm$", cursorOffset: 4 },
  { label: "≤", insert: "$\\leq$", cursorOffset: 5 },
  { label: "≥", insert: "$\\geq$", cursorOffset: 5 },
  { label: "π", insert: "$\\pi$", cursorOffset: 4 },
];

export interface MathEditorHandle {
  focus: () => void;
}

export const MathEditor = forwardRef<MathEditorHandle, Props>(function MathEditor(
  { value, onChange, placeholder, rows = 6, compact = false, id },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  function insertAtCursor(snippet: Snippet) {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(value + snippet.insert);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = before + snippet.insert + after;
    onChange(next);
    // Restore cursor inside the snippet on the next tick.
    requestAnimationFrame(() => {
      ta.focus();
      const offset = snippet.cursorOffset ?? snippet.insert.length;
      const pos = start + offset;
      ta.setSelectionRange(pos, pos);
    });
  }

  /**
   * Numbers the lines of the current selection sequentially (1., 2., 3., …)
   * to produce a markdown ordered list. If nothing is selected, drops a
   * starter `1. ` at the start of the current line so the admin can keep
   * typing. Lines that are already numbered get re-numbered to keep the
   * sequence consistent.
   */
  function insertOrderedList() {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(value + (value.endsWith("\n") || value === "" ? "" : "\n") + "1. ");
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (start !== end) {
      const before = value.slice(0, start);
      const selected = value.slice(start, end);
      const after = value.slice(end);
      // Strip any pre-existing numeric prefix (with OR without a space
      // after the period — admins frequently paste `1.If` from print
      // sources). Re-applying the prefix with a proper `N. ` shape is
      // what makes markdown actually recognise it as an ordered list.
      const numbered = selected
        .split("\n")
        .map((line, i) => {
          const stripped = line.replace(/^\s*\d+\.\s*/, "");
          return `${i + 1}. ${stripped}`;
        })
        .join("\n");
      const next = before + numbered + after;
      onChange(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start, start + numbered.length);
      });
      return;
    }

    // No selection — insert "1. " at the start of the current line.
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const before = value.slice(0, lineStart);
    const rest = value.slice(lineStart);
    const prefix = "1. ";
    const next = before + prefix + rest;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + prefix.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  /**
   * Wraps the current textarea selection in `open` + `close`. If nothing is
   * selected, inserts the empty pair and parks the cursor between them so the
   * admin can just start typing. Used for inline formatting like `<u>…</u>`,
   * where the natural "insert at cursor" model doesn't fit.
   */
  function wrapSelection(open: string, close: string) {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(value + open + close);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = before + open + selected + close + after;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursorStart = start + open.length;
      const cursorEnd = cursorStart + selected.length;
      ta.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  return (
    <div className={cn("flex flex-col gap-2", compact && "gap-1.5")}>
      {!compact && (
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Format
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => wrapSelection("<u>", "</u>")}
            title="Underline selection (Ctrl/Cmd+U)"
            aria-label="Underline"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => insertOrderedList()}
            title="Numbered list — numbers selected lines, or drops a starter 1."
            aria-label="Numbered list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <span className="mx-1 h-4 w-px bg-slate-300" aria-hidden />
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Math
          </span>
          {SNIPPETS.map((s) => (
            <Button
              key={s.label}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 font-mono text-[13px]"
              onClick={() => insertAtCursor(s)}
              title={`Insert ${s.insert}`}
            >
              {s.label}
            </Button>
          ))}
          <span className="ml-2 text-[11px] text-slate-500">
            Wrap math in <code>$…$</code>. Live preview on the right.
          </span>
        </div>
      )}

      <div
        className={cn(
          "grid gap-3",
          compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 lg:grid-cols-2",
        )}
      >
        <Textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd+U → underline the current selection. Only wired on the
            // full-toolbar editor; the compact option editor stays unchanged
            // since its toolbar (and therefore underline affordance) is hidden.
            if (!compact && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
              e.preventDefault();
              wrapSelection("<u>", "</u>");
            }
          }}
          rows={compact ? 2 : rows}
          placeholder={placeholder}
          className="font-mono text-[13px]"
        />
        <div
          className={cn(
            "rounded-md border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-800",
            compact && "text-[13px]",
          )}
          aria-live="polite"
          aria-label="Live preview"
        >
          {value.trim().length === 0 ? (
            <span className="text-[12px] italic text-slate-400">
              Live preview…
            </span>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                // remark-breaks turns a single newline into a `<br/>`, so the
                // preview shows hard line breaks the way the admin typed them.
                // True paragraph breaks (a blank line / `\n\n`) still produce
                // separate `<p>` blocks via the default markdown rules.
                remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                // rehype-raw passes the source's raw HTML through (e.g. the
                // `<u>…</u>` produced by the Underline toolbar button) so the
                // live preview matches what we'll render server-side.
                rehypePlugins={[rehypeRaw, rehypeKatex]}
              >
                {value}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
