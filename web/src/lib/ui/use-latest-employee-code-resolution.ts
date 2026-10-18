"use client";

import { useCallback, useEffect, useRef } from "react";

import type { HrAdminEmployeeOptionSearchResponse, HrAdminOptionItem } from "@/lib/types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

async function searchEmployeeOptions(query: string, limit: number, signal: AbortSignal) {
  const params = new URLSearchParams({ limit: String(limit), q: query });
  const response = await fetch(`/api/hr-admin/employees/option-search?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  const payload = (await response.json().catch(() => null)) as HrAdminEmployeeOptionSearchResponse | null;
  if (!response.ok || !payload || !("items" in payload)) {
    throw new Error("Employee lookup failed.");
  }
  return payload.items;
}

async function resolveEmployeeCodes(employeeCodes: string[], signal: AbortSignal) {
  const normalizedCodes = Array.from(new Set(employeeCodes.map(normalize).filter(Boolean)));
  const prefix = normalizedCodes.reduce((left, right) => {
    let index = 0;
    while (index < left.length && left[index] === right[index]) index += 1;
    return left.slice(0, index);
  }, normalizedCodes[0] ?? "");
  const lookup = new Map<string, HrAdminOptionItem>();

  if (prefix.length >= 3) {
    for (const item of await searchEmployeeOptions(prefix, 250, signal)) {
      lookup.set(normalize(item.employee_code ?? item.name), item);
    }
  }

  const unresolvedCodes = normalizedCodes.filter((employeeCode) => !lookup.has(employeeCode));
  const entries = await Promise.all(unresolvedCodes.map(async (employeeCode) => {
    const items = await searchEmployeeOptions(employeeCode, 10, signal);
    const exactMatch = items.find((item) => normalize(item.employee_code ?? item.name) === employeeCode);
    return [employeeCode, exactMatch ?? items[0] ?? null] as const;
  }));
  for (const [employeeCode, item] of entries) {
    if (item) lookup.set(employeeCode, item);
  }
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
