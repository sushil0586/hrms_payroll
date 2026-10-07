"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PlatformGovernanceCard, PlatformGovernanceNotice } from "@/components/patterns/platform-governance-card";
import type { HrAdminLeavePolicy } from "@/lib/types";

type Props = {
  canManagePolicies: boolean;
  policies: HrAdminLeavePolicy[];
};

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function uniqueValues(items: string[]) {
  return [...new Set(items.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

export function LeavePolicyList({ canManagePolicies, policies }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [accrualFrequency, setAccrualFrequency] = useState("");

  const statusOptions = useMemo(() => uniqueValues(policies.map((item) => item.status)), [policies]);
  const leaveTypeOptions = useMemo(() => uniqueValues(policies.map((item) => item.leave_type)), [policies]);
  const accrualOptions = useMemo(() => uniqueValues(policies.map((item) => item.accrual_frequency)), [policies]);

  const filteredPolicies = useMemo(() => {
    const search = normalized(query);
    return policies.filter((item) => {
      const matchesQuery = !search || [item.name, item.code, item.leave_type, item.status, item.accrual_frequency].some((value) => normalized(value).includes(search));
      const matchesStatus = !status || item.status === status;
      const matchesLeaveType = !leaveType || item.leave_type === leaveType;
      const matchesAccrual = !accrualFrequency || item.accrual_frequency === accrualFrequency;
      return matchesQuery && matchesStatus && matchesLeaveType && matchesAccrual;
    });
  }, [accrualFrequency, leaveType, policies, query, status]);

  function clearFilters() {
    setQuery("");
    setStatus("");
    setLeaveType("");
    setAccrualFrequency("");
  }

  return (
    <section className="section queue-layout">
      <div className="queue-toolbar panel-card-soft">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Policy filters</h2>
            <p className="section-copy section-copy-soft">Find the right leave policy by name, type, status, or accrual behavior before editing.</p>
          </div>
          <span className="queue-summary-chip"><strong>{filteredPolicies.length}</strong> shown</span>
        </div>
        <div className="queue-toolbar__grid">
          <label className="form-field">
            <span className="muted">Search</span>
            <input className="input-control" onChange={(event) => setQuery(event.target.value)} placeholder="Policy name, code, type, status" value={query} />
          </label>
          <label className="form-field">
            <span className="muted">Status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Leave type</span>
            <select className="input-control" onChange={(event) => setLeaveType(event.target.value)} value={leaveType}>
              <option value="">All leave types</option>
              {leaveTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Accrual frequency</span>
            <select className="input-control" onChange={(event) => setAccrualFrequency(event.target.value)} value={accrualFrequency}>
              <option value="">All accruals</option>
              {accrualOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="queue-toolbar__summary">
          <span className="queue-summary-chip"><strong>{policies.length}</strong> total</span>
          <span className="queue-summary-chip"><strong>{status || "Any"}</strong> status</span>
          <span className="queue-summary-chip"><strong>{leaveType || "Any"}</strong> leave type</span>
          <button className="button button--secondary" onClick={clearFilters} type="button">Clear filters</button>
        </div>
      </div>

      <div className="queue-list">
        {filteredPolicies.map((item) => (
          <article className="record-card" key={item.id}>
            <div className="record-card__header">
              <div className="record-card__title-wrap">
                <div className="record-card__title">
                  <h2>{item.name}</h2>
                </div>
                <div className="record-card__eyebrow">
                  <span className="record-chip record-chip--accent">{item.leave_type}</span>
                  <span className="record-chip">{item.status}</span>
                  <span className="record-chip">{item.accrual_frequency}</span>
                  <PlatformGovernanceCard item={item} />
                </div>
                <p className="section-copy">{item.code}</p>
              </div>
              <div className="record-card__actions">
                {canManagePolicies ? (
                  <Link className="button button--secondary" href={`/hr-admin/leave-policies/${item.id}/edit`}>
                    Edit
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Annual entitlement</span>
                <span className="detail-value">{item.annual_entitlement} units</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Accrual frequency</span>
                <span className="detail-value">{item.accrual_frequency}</span>
              </div>
            </div>
            <PlatformGovernanceNotice item={item} />
          </article>
        ))}
        {filteredPolicies.length === 0 ? (
          <div className="card panel">
            <strong>No leave policies match the current filters.</strong>
            <p className="section-copy section-copy-soft">Clear filters or broaden the search to review more policy records.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
