"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Reads and writes a list's query string. Every change except `page` itself returns to page 1.
 * Ported from buildframe_ecomm's data-table.tsx.
 */
export function useListUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const push = React.useCallback(
    (patch: Record<string, string | number | null>, mode: "push" | "replace" = "push") => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || (k === "page" && Number(v) <= 1)) next.delete(k);
        else next.set(k, String(v));
      }
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => (mode === "replace" ? router.replace(url, { scroll: false }) : router.push(url, { scroll: false })));
    },
    [sp, pathname, router],
  );

  /** Replaces the whole query string (applying a saved view). */
  const replaceAll = React.useCallback(
    (qs: string) => {
      const url = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => router.push(url, { scroll: false }));
    },
    [pathname, router],
  );

  return { push, replaceAll, pending, sp, pathname };
}
