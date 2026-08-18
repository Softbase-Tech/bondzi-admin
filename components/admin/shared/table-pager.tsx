"use client";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

/**
 * Shared prev/next pager for every admin list backed by
 * `Paginated<T>`. Renders the "Showing X–Y of Z" line and two
 * buttons with proper boundary disable using `total`.
 *
 * Previous approach — `disabled={items.length < limit}` — was a
 * heuristic that mis-fires on exactly-full last pages: a query
 * that returns 20 rows on page 3 of a 60-row set kept "Next"
 * enabled, took the reviewer to an empty page 4, and left them
 * thinking they'd hit a bug. This variant checks
 * `page * limit >= total` — exact, no false positives.
 *
 * `total` is nullable: some list endpoints don't expose a running
 * count. In that case the "Showing X–Y" line and the exact Next
 * disable are suppressed and we fall back to the heuristic —
 * mildly worse UX, but degrades safely rather than lying.
 */
export function TablePager({
  page,
  limit,
  itemCount,
  total,
  onPageChange,
  className,
}: {
  page: number;
  limit: number;
  itemCount: number;
  total: number | null;
  onPageChange: (next: number) => void;
  className?: string;
}) {
  const hasTotal = typeof total === "number" && Number.isFinite(total);
  const from = itemCount > 0 ? (page - 1) * limit + 1 : 0;
  const to = itemCount > 0 ? (page - 1) * limit + itemCount : 0;
  const disableNext = hasTotal
    ? page * limit >= (total as number)
    : itemCount < limit;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 ${
        className ?? ""
      }`}
    >
      <p className="text-xs text-slate-500">
        {hasTotal ? (
          itemCount > 0 ? (
            <>
              Showing {formatNumber(from)}–{formatNumber(to)} of{" "}
              {formatNumber(total as number)}
            </>
          ) : (
            <>No rows</>
          )
        ) : (
          <>
            Page {page}
            {itemCount > 0 ? ` · ${itemCount} on this page` : ""}
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disableNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
