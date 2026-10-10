"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { HrAdminEmployeeOptionSearchResponse, HrAdminOptionItem } from "@/lib/types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onOptionSelected?: (item: HrAdminOptionItem | null) => void;
  label?: string;
  hint?: string;
  initialOptions?: HrAdminOptionItem[];
  selectedLabel?: string | null;
};

function optionLabel(item: HrAdminOptionItem) {
  return item.employee_code ? `${item.employee_code} - ${item.name}` : item.name;
}

export function EmployeeSearchSelect({ value, onChange, onOptionSelected, label = "Employee", hint = "Search by employee code, name, or work email.", initialOptions = [], selectedLabel }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<HrAdminOptionItem[]>(initialOptions);
  const [totalCount, setTotalCount] = useState(initialOptions.length);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const searchEmployees = useCallback(async (searchTerm: string) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "25" });
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      const response = await fetch(`/api/hr-admin/employees/option-search?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as HrAdminEmployeeOptionSearchResponse | { detail?: string } | null;
      if (requestId !== requestIdRef.current) return;
      if (!response.ok || !payload || !("items" in payload)) {
        setItems([]);
        setTotalCount(0);
        setError((payload && "detail" in payload && payload.detail) || "Unable to load employee options.");
        return;
      }
      setItems(payload.items);
      setTotalCount(payload.total_count);
    } catch {
      if (requestId === requestIdRef.current) {
        setItems([]);
        setTotalCount(0);
        setError("Unable to load employee options.");
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      void searchEmployees(query);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, searchEmployees]);

  const selectedIsVisible = !value || items.some((item) => item.id === value);

  return (
    <div className="queue-toolbar__search">
      <label className="queue-toolbar__search">
        <span className="muted">Find person</span>
        <input
          className="input-control"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (items.length === 0 && !isLoading) void searchEmployees(query);
          }}
          placeholder="Code, name, or email"
          type="search"
          value={query}
        />
      </label>
      <label className="queue-toolbar__search">
        <span className="muted">{label}</span>
        <select
          className="input-control"
          onFocus={() => {
            if (items.length === 0 && !isLoading) void searchEmployees(query);
          }}
          value={selectedIsVisible ? value : ""}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            onOptionSelected?.(items.find((item) => item.id === nextValue) ?? null);
          }}
        >
          <option value="">{isLoading ? "Loading employees..." : "Select an employee"}</option>
          {value && !selectedIsVisible && selectedLabel ? <option value={value}>{selectedLabel}</option> : null}
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {optionLabel(item)}
            </option>
          ))}
        </select>
      </label>
      <span className={error ? "field-help-text field-help-text--warning" : "field-help-text"}>
        {error || (totalCount > items.length ? `${items.length} of ${totalCount} employees shown. Refine search for more.` : hint)}
      </span>
    </div>
  );
}
