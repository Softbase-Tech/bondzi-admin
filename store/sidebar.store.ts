import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarStore {
  /**
   * Desktop rail expanded vs icon-only. User preference, persisted.
   * Only consulted at `lg` and above — narrower viewports use the drawer.
   */
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;

  /**
   * Mobile/tablet navigation drawer. Deliberately NOT persisted — see
   * `partialize` below.
   */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isOpen: true,
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      setOpen: (open) => set({ isOpen: open }),

      mobileOpen: false,
      setMobileOpen: (open) => set({ mobileOpen: open }),
    }),
    {
      name: "admin-sidebar",
      /**
       * Persist the rail preference only.
       *
       * Without this, `mobileOpen` would be written to localStorage and
       * rehydrated on the next visit — so an admin who closed the app with
       * the drawer open would land on a page with a modal drawer already
       * covering it, over a route they never chose. Transient UI state does
       * not belong in persisted storage.
       */
      partialize: (s) => ({ isOpen: s.isOpen }),
    },
  ),
);
