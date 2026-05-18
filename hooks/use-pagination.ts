"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

export function usePagination(defaultLimit = 20) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = parseInt(params.get("page") ?? "1", 10) || 1;
  const limit = parseInt(params.get("limit") ?? String(defaultLimit), 10) || defaultLimit;

  const setPage = useCallback(
    (next: number) => {
      const sp = new URLSearchParams(params);
      sp.set("page", String(Math.max(1, next)));
      router.replace(`${pathname}?${sp.toString()}`);
    },
    [params, pathname, router],
  );

  const setLimit = useCallback(
    (next: number) => {
      const sp = new URLSearchParams(params);
      sp.set("limit", String(next));
      sp.set("page", "1");
      router.replace(`${pathname}?${sp.toString()}`);
    },
    [params, pathname, router],
  );

  return useMemo(
    () => ({ page, limit, setPage, setLimit }),
    [page, limit, setPage, setLimit],
  );
}
