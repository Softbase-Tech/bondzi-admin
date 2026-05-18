"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebar.store";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DashboardMetrics } from "@/types/api";
import { NAV_GROUPS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, toggle } = useSidebarStore();

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
    if (key === "flags" && metrics.pendingFlags > 0)
      return metrics.pendingFlags;
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

  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200",
        isOpen ? "w-56" : "w-14",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3">
        {/* Brand mark — uses the same icon as the website + mobile so
            an admin who also tests the consumer app sees one identity.
            `unoptimized` avoids the Next.js image optimizer on a static
            asset that already ships at 512px. */}
        {isOpen ? (
          <Link
            href="/admin"
            className="flex items-center gap-2 text-slate-900 font-semibold"
          >
            <Image
              src="/brand/icon-black.png"
              alt="Bondzi"
              width={28}
              height={28}
              priority
              unoptimized
              className="h-7 w-7"
            />
            Bondzi
          </Link>
        ) : (
          <Image
            src="/brand/icon-black.png"
            alt="Bondzi"
            width={28}
            height={28}
            priority
            unoptimized
            className="mx-auto h-7 w-7"
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="h-8 w-8"
        >
          {isOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              {isOpen && (
                <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const count = badge(item.badgeKey);
                const active = isActive(item.href);
                const informational = item.badgeKey === "questions";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      // Active row uses the soft-orange brand surface
                      // (--color-accent) with the deep-orange brand
                      // text so the current page is unmistakable but
                      // still legible in dense lists.
                      active
                        ? "bg-accent text-primary-deep font-medium"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      !isOpen && "justify-center",
                    )}
                    title={item.label}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {isOpen && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {count ? (
                          <Badge
                            variant={informational ? "outline" : "destructive"}
                            className="ml-auto"
                          >
                            {typeof count === "number"
                              ? count.toLocaleString("en-GH")
                              : count}
                          </Badge>
                        ) : null}
                      </>
                    )}
                  </Link>
                );
              })}
              {isOpen && <Separator className="mt-2 opacity-50" />}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {isOpen && (
        <div className="border-t border-slate-200 p-3 text-[11px] text-slate-400">
          Bondzi Admin · v2.0
        </div>
      )}
    </aside>
  );
}
