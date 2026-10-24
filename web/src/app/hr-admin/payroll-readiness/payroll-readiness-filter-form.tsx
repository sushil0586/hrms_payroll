"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

export function PayrollReadinessFilterForm({
  periodEnd,
  periodStart,
  q,
  pageSize,
  status,
}: {
  periodEnd: string;
  periodStart: string;
  q: string;
  pageSize: number;
  status: string;
}) {
  const router = useRouter();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const normalized = String(value).trim();
      if (normalized) params.set(key, normalized);
    }
    router.push(`/hr-admin/payroll-readiness?${params.toString()}`);
  }

  return (
    <form className="payroll-filter-form" onSubmit={applyFilters}>
      <input type="hidden" name="tab" value="employees" />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="page" value="1" />
      <input aria-label="Search" className="input-control" defaultValue={q} name="q" placeholder="Search employee, entity, cost center" />
      <input aria-label="Period start" className="input-control" defaultValue={periodStart} name="period_start" type="date" />
      <input aria-label="Period end" className="input-control" defaultValue={periodEnd} name="period_end" type="date" />
      <select aria-label="Page size" className="input-control" defaultValue={String(pageSize)} name="page_size">
        {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} / page</option>)}
      </select>
      <button className="button button--primary" type="submit">Apply</button>
    </form>
  );
}
