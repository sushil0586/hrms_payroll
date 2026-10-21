"use client";

import { useCallback, useEffect, useRef } from "react";

import type { HrAdminEmployeeOptionSearchResponse, HrAdminOptionItem } from "@/lib/types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

async function searchEmployeeOptions(code: string, signal: AbortSignal) {
  const params = new URLSearchParams({ limit: "2", employee_code: code });
  let response: Response;
  try {
    response = await fetch(`/api/hr-admin/employees/option-search?${params.toString()}`, { cache: "no-store", signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Employee lookup failed. Check your connection and preview the CSV again.");
  }
  const payload = (await response.json().catch(() => null)) as HrAdminEmployeeOptionSearchResponse | null;
  if (!response.ok || !payload || !Array.isArray(payload.items) || !Number.isSafeInteger(payload.total_count) || payload.total_count < 0) {
    throw new Error("Employee lookup failed. Check your session and connection, then preview the CSV again.");
  }
  const exact = payload.items.filter(item => normalize(item.employee_code ?? "") === code);
  if (payload.total_count > 1 || exact.length > 1) throw new Error("Employee code is ambiguous. Ask HR to correct the duplicate codes before importing.");
  if (payload.total_count !== exact.length) throw new Error("Employee lookup returned an unexpected result. No employee was selected.");
  return exact[0] ?? null;
}

export async function resolveEmployeeCodes(employeeCodes: string[], signal: AbortSignal) {
  const normalizedCodes = Array.from(new Set(employeeCodes.map(normalize).filter(Boolean)));
  if (normalizedCodes.length > 250) throw new Error("Preview at most 250 distinct employee codes per batch.");
  const lookup = new Map<string, HrAdminOptionItem>();
  let next = 0;
  // Bound read concurrency; never approximate an unresolved code using a name or prefix.
  await Promise.all(Array.from({ length: Math.min(6, normalizedCodes.length) }, async () => {
    while (next < normalizedCodes.length) {
      const code = normalizedCodes[next++];
      const item = await searchEmployeeOptions(code, signal);
      if (item) lookup.set(code, item);
    }
  }));
  return lookup;
}

export function useLatestEmployeeCodeResolution() {
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return useCallback(async (employeeCodes: string[]) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    try {
      const result = await resolveEmployeeCodes(employeeCodes, controller.signal);
      return requestId === requestIdRef.current ? result : null;
    } catch (error) {
      if (controller.signal.aborted) return null;
      throw error;
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);
}
