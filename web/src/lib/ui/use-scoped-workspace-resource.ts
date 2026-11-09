"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ScopedHistoryMode = "push" | "replace" | "none";
export type ScopedLoadReason = "load" | "history";

export class ScopedResourceError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ScopedResourceError";
    this.status = status;
  }
}

type Options<Data, Query> = {
  initialData: Data;
  initialQuery: Query;
  request: (query: Query, signal: AbortSignal) => Promise<Data>;
  resolveQuery?: (requestedQuery: Query, data: Data) => Query;
  historyHref?: (query: Query, data: Data) => string;
  readHistoryQuery?: () => Query;
  onApplied?: (query: Query, data: Data, reason: ScopedLoadReason) => void;
  onUnauthorized?: () => void;
  fallbackError: string;
};

type LoadResult<Data, Query> =
  | { ok: true; data: Data; query: Query }
  | { ok: false; aborted: boolean; error?: string };

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Owns a bounded workspace resource after its server-rendered first load.
 *
 * Successful reads reconcile data and then commit URL history. Failed reads
 * retain the last confirmed data/query/URL. A later request aborts and
 * invalidates every older request so late responses cannot win.
 */
export function useScopedWorkspaceResource<Data, Query>({
  initialData,
  initialQuery,
  request,
  resolveQuery,
  historyHref,
  readHistoryQuery,
  onApplied,
  onUnauthorized,
  fallbackError,
}: Options<Data, Query>) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState(initialQuery);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async (
    nextQuery: Query,
    historyMode: ScopedHistoryMode = "push",
    reason: ScopedLoadReason = "load",
  ): Promise<LoadResult<Data, Query>> => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    const version = ++requestVersion.current;
    activeRequest.current = controller;
    setIsPending(true);
    setError("");

    try {
      const nextData = await request(nextQuery, controller.signal);
      if (controller.signal.aborted || version !== requestVersion.current) {
        return { ok: false, aborted: true };
      }

      const appliedQuery = resolveQuery?.(nextQuery, nextData) ?? nextQuery;
      setData(nextData);
      setQuery(appliedQuery);
      onApplied?.(appliedQuery, nextData, reason);
      if (historyMode !== "none" && historyHref) {
        window.history[historyMode === "push" ? "pushState" : "replaceState"](
          null,
          "",
          historyHref(appliedQuery, nextData),
        );
      }
      return { ok: true, data: nextData, query: appliedQuery };
    } catch (caught) {
      if (isAbortError(caught) || controller.signal.aborted || version !== requestVersion.current) {
        return { ok: false, aborted: true };
      }
      if (caught instanceof ScopedResourceError && caught.status === 401) {
        onUnauthorized?.();
        return { ok: false, aborted: false, error: caught.message };
      }
      const message = caught instanceof Error && caught.message ? caught.message : fallbackError;
      setError(message);
      return { ok: false, aborted: false, error: message };
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsPending(false);
      }
    }
  }, [fallbackError, historyHref, onApplied, onUnauthorized, request, resolveQuery]);

  useEffect(() => {
    if (!readHistoryQuery) return;
    const restore = () => {
      void load(readHistoryQuery(), "none", "history");
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [load, readHistoryQuery]);

  useEffect(() => () => {
    requestVersion.current += 1;
    activeRequest.current?.abort();
  }, []);

  const reconcile = useCallback((update: Data | ((current: Data) => Data)) => {
    setData((current) => typeof update === "function"
      ? (update as (value: Data) => Data)(current)
      : update);
  }, []);

  const clearError = useCallback(() => setError(""), []);
  const cancel = useCallback(() => {
    requestVersion.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    setIsPending(false);
  }, []);

  return {
    data,
    query,
    isPending,
    error,
    load,
    reconcile,
    clearError,
    cancel,
  };
}
