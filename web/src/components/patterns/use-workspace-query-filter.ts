"use client";
import { useSearchParams } from "next/navigation";

/** Instant, in-memory catalog/report filters retain their shareable URL on refresh. */
export function useWorkspaceQueryFilter(key: string, initial: string): [string, (value: string) => void] {
  const params = useSearchParams();
  const value = params.get(key) ?? initial;
  return [value, next => {
    const url = new URL(window.location.href);
    if (next === initial || !next) url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    // Read the live URL for each update so a multi-field Clear cannot resurrect old values.
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }];
}
