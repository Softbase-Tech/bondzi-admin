import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard page title block, used by every admin page.
 *
 * Responsive shape: below `sm` the title and its actions stack, because
 * action clusters here are routinely two or three buttons ("Import",
 * "Export", "New question") and forcing them onto the title's row on a
 * phone either squashes the heading to a couple of characters or pushes
 * the buttons off-screen. Stacked, the actions get a full-width row and
 * stay comfortably tappable. From `sm` up the original side-by-side
 * layout is unchanged.
 *
 * `min-w-0` on the text column lets a long title truncate rather than
 * force the header wider than the page.
 */
export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions && (
        // `flex-wrap` so a third button drops to its own line instead of
        // overflowing; `shrink-0` so the cluster keeps its natural size
        // once it shares a row with the title.
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
