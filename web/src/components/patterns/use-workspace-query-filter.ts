"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, type Dispatch, type SetStateAction } from "react";

function writeQueryValue(key: string, initial: string, next: string) {
  const url = new URL(window.location.href);
  if (next === initial || !next) url.searchParams.delete(key);
  else url.searchParams.set(key, next);
  // Read the live URL for each update so a multi-field Clear cannot resurrect old values.
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/** Instant, in-memory catalog/report filters retain their shareable URL on refresh. */
export function useWorkspaceQueryFilter(key: string, initial: string): [string, (value: string) => void] {
  const params = useSearchParams();
  const value = params.get(key) ?? initial;
  return [value, next => writeQueryValue(key, initial, next)];
}

/** URL-backed report pagination with the same setter shape as useState. */
export function useWorkspaceQueryPage(key = "page", initial = 1): [number, Dispatch<SetStateAction<number>>] {
  const params = useSearchParams();
  const parsed = Number(params.get(key));
  const value = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : initial;
  return [value, next => {
    const resolved = typeof next === "function" ? next(value) : next;
    writeQueryValue(key, String(initial), String(Math.max(1, Math.trunc(resolved))));
  }];
}

/** Corrects a stale page after a filter reduces the result set. */
export function useCorrectedWorkspaceQueryPage(page: number, pageCount: number, key = "page") {
  const currentPage = Math.min(page, Math.max(1, pageCount));
  useEffect(() => {
    if (page === currentPage) return;
    writeQueryValue(key, "1", String(currentPage));
  }, [currentPage, key, page]);
  return currentPage;
}
