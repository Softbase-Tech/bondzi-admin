"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebar.store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrandMark } from "./brand-mark";
import { SidebarNav } from "./sidebar-nav";

/**
 * The persistent navigation rail. Three tiers:
 *
 *   • `< md`  — not rendered at all. A 224px rail on a 375px phone leaves
 *     no room for the content it navigates to, so below `md` navigation
 *     moves into `MobileNav`'s drawer.
 *   • `md..lg` — icon-only rail (56px). A tablet has room for permanent
 *     navigation but not for labels beside a data table, and an
 *     always-there rail beats a drawer the user must open on every hop.
 *   • `lg+`   — full rail, collapsible to icons via the toggle. The
 *     preference persists (`sidebar.store`).
 *
 * Width is driven by CSS breakpoints rather than JS so there is no resize
 * listener, no hydration branch, and no layout shift on first paint — the
 * server and client render identical markup.
 *
 * The collapse toggle lives in the footer, not the header: at 56px the
 * header cannot hold a 28px brand mark and a 32px button at once, and
 * dropping the brand to make room costs identity on every tablet session.
 * The footer has that row to itself in both states.
 */
export function Sidebar() {
  const { isOpen, toggle } = useSidebarStore();

  // Visible only where the expanded rail is reachable. Below `lg` the rail
  // is always icons, so a collapse control there would do nothing.
  const lgOnly = "hidden lg:flex";

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 flex-col border-r border-slate-200 bg-white md:flex",
        "transition-[width] duration-200 motion-reduce:transition-none",
        // Tablet is always the icon rail; only lg+ honours the preference.
        isOpen ? "w-14 lg:w-56" : "w-14",
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-slate-200 px-3 lg:justify-start">
        <BrandMark wordmarkClassName={isOpen ? "hidden lg:inline" : "hidden"} />
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <SidebarNav variant="rail" expanded={isOpen} />
      </ScrollArea>

      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-t border-slate-200 p-3",
          isOpen ? "justify-center lg:justify-between" : "justify-center",
        )}
      >
        <span
          className={cn(
            "text-[11px] text-slate-400",
            isOpen ? "hidden lg:inline" : "hidden",
          )}
        >
          Bondzi Admin · v2.0
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          className={cn("h-8 w-8 shrink-0", lgOnly)}
        >
          {isOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
