import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Persistent per-page filter state. Navigating away from a list page and
 * back restores the last filters — admins working flag queues don't want to
 * lose their view. Keyed by route segment.
 */
interface FiltersStore {
  filters: Record<string, Record<string, unknown>>;
  setFilters: (page: string, filters: Record<string, unknown>) => void;
  clearFilters: (page: string) => void;
  getFilters: (page: string) => Record<string, unknown>;
}

export const useFiltersStore = create<FiltersStore>()(
  persist(
    (set, get) => ({
      filters: {},
      setFilters: (page, f) =>
        set((s) => ({ filters: { ...s.filters, [page]: f } })),
      clearFilters: (page) =>
        set((s) => ({ filters: { ...s.filters, [page]: {} } })),
      getFilters: (page) => get().filters[page] ?? {},
    }),
    { name: "admin-filters" },
  ),
);
