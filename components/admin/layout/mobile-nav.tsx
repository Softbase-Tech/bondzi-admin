"use client";

import { Menu } from "lucide-react";
import { useSidebarStore } from "@/store/sidebar.store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BrandMark } from "./brand-mark";
import { SidebarNav } from "./sidebar-nav";

/**
 * Navigation for viewports below `md`, where the rail is not rendered.
 *
 * Two exported pieces because the trigger and the panel live in different
 * places: the button belongs in the topbar next to the other controls, the
 * panel is portalled to the document root by Radix. They talk through the
 * sidebar store rather than a shared parent, which keeps the topbar from
 * having to own drawer state it does not otherwise care about.
 */

/** Hamburger. Rendered in the topbar; hidden once the rail appears. */
export function MobileNavTrigger() {
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setMobileOpen(true)}
      aria-label="Open navigation"
      className="h-9 w-9 shrink-0 md:hidden"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

/** The drawer itself. Mounted once, from the admin layout. */
export function MobileNav() {
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent
        side="left"
        // The shared SheetContent defaults to `max-w-xl`, which on a phone
        // is the whole screen — a nav panel should leave enough of the page
        // behind it to make "tap outside to dismiss" obvious.
        className="flex w-[17rem] max-w-[85vw] flex-col p-0"
        aria-describedby={undefined}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-4">
          {/* Radix requires a title for the dialog's accessible name. The
              brand mark is the visible header, so the title is visually
              hidden rather than duplicated on screen. */}
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <BrandMark onClick={() => setMobileOpen(false)} />
        </div>

        {/* Native scroll rather than the ScrollArea used on the rail: this
            is a touch surface, and 46 nav rows want momentum scrolling and
            the platform's own overscroll behaviour. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          <SidebarNav
            variant="drawer"
            onNavigate={() => setMobileOpen(false)}
          />
        </div>

        <div className="shrink-0 border-t border-slate-200 p-3 text-[11px] text-slate-400">
          Bondzi Admin · v2.0
        </div>
      </SheetContent>
    </Sheet>
  );
}
