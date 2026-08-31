"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { DashboardMetrics } from "@/types/api";
import { NAV_GROUPS } from "./nav-items";

/**
 * The navigation list itself, rendered in two places:
 *
 *   • the desktop rail (`Sidebar`), which can be icon-only, and
 *   • the mobile/tablet drawer (`MobileNav`), which never is.
 *
 * Extracted so the 46 nav rows, their active-state logic and their badge
 * counts exist once. Two copies would drift the moment a route is added.
 *
 * `expanded` controls whether labels render at all. When the rail is
 * expanded it is still hidden below `lg` — the rail is icon-only on
 * tablet — so labels carry `hidden lg:*` and the icon stays centred by
 * CSS at that width. Doing that in CSS rather than JS keeps the markup
 * identical across breakpoints, so resizing the window never remounts
 * the nav or loses scroll position.
 */
export function SidebarNav({
  variant,
  expanded = true,
  onNavigate,
}: {
  /**
   * Where this nav is mounted. It decides label visibility, and the two
   * cases are genuinely different: the rail's labels are also gated on
   * the viewport (icons on tablet), while the drawer only ever renders
   * below `md` and must always show them.
   */
  variant: "rail" | "drawer";
  /** Rail only: whether the user has the rail expanded. Ignored by the drawer. */
  expanded?: boolean;
  /**
   * Called when a nav link is activated. The drawer passes a close
   * handler here rather than watching the pathname in an effect —
   * closing on click is immediate, and avoids a setState-in-effect.
   */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // Background query for nav badges (§6.1 — refresh every 60s).
  const { data: metrics } = useQuery({
    queryKey: QK.DASHBOARD_METRICS(),
    queryFn: () => unwrap<DashboardMetrics>(api.get("/admin/dashboard")),
    refetchInterval: 60_000,
  });

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);

  const badge = (
    key?:
      | "flags"
      | "explanations"
      | "jobs"
      | "pmTestReview"
      | "winners"
      | "questions",
  ) => {
    if (!metrics) return null;
    if (key === "flags" && metrics.pendingFlags > 0) return metrics.pendingFlags;
    if (key === "pmTestReview" && metrics.pmTestPendingReview > 0) {
      return metrics.pmTestPendingReview;
    }
    if (
      key === "winners" &&
      (metrics.winnersPendingWeeklyBece || metrics.winnersPendingWeeklyWassce)
    ) {
      return "!";
    }
    if (key === "questions") {
      const total = metrics.questionsBece + metrics.questionsWassce;
      return total > 0 ? total : null;
    }
    return null;
  };

  // Label visibility, and the row alignment that has to follow it: an icon
  // with no label must centre itself, at exactly the widths where the label
  // is hidden and not a pixel wider.
  //
  //   drawer          → labels always (it only exists below `md`)
  //   rail, expanded  → labels from `lg` up (tablet stays icons)
  //   rail, collapsed → never
  const isDrawer = variant === "drawer";
  const labelVis = isDrawer ? "flex" : expanded ? "hidden lg:flex" : "hidden";
  const rowLayout = isDrawer
    ? "justify-start"
    : expanded
      ? "justify-center lg:justify-start"
      : "justify-center";
  // The dot stands in for a badge that cannot fit next to a centred icon,
  // so it appears exactly where the badge is hidden.
  const dotVis = isDrawer ? "hidden" : expanded ? "lg:hidden" : "";

  return (
    <nav className="flex flex-col gap-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <div
            className={cn(
              "px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400",
              labelVis,
            )}
          >
            {group.label}
          </div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const count = badge(item.badgeKey);
            const active = isActive(item.href);
            const informational = item.badgeKey === "questions";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // min-h-9 keeps every row a comfortable tap target in the
                  // drawer without making the desktop rail feel loose.
                  "relative flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  rowLayout,
                  // Active row uses the soft-orange brand surface
                  // (--color-accent) with the deep-orange brand text so the
                  // current page is unmistakable but still legible in dense
                  // lists.
                  active
                    ? "bg-accent text-primary-deep font-medium"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn("flex-1 truncate", labelVis)}>
                  {item.label}
                </span>
                {count ? (
                  <>
                    <Badge
                      variant={informational ? "outline" : "destructive"}
                      className={cn("ml-auto", labelVis)}
                    >
                      {typeof count === "number"
                        ? count.toLocaleString("en-GH")
                        : count}
                    </Badge>
                    {/* Icon-rail fallback: a full badge cannot fit beside a
                        centred icon, but "something needs attention" must
                        not vanish just because labels are hidden. */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full",
                        informational ? "bg-slate-400" : "bg-destructive",
                        dotVis,
                      )}
                    />
                  </>
                ) : null}
              </Link>
            );
          })}
          <Separator className={cn("mt-2 opacity-50", labelVis)} />
        </div>
      ))}
    </nav>
  );
}
