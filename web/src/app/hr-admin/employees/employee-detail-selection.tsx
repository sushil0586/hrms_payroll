"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { formatWorkspaceDateTime as formatDateTime } from "@/lib/ui/date-time-format";
import { ActionMenu } from "@/components/patterns/action-menu";
import type { HrAdminEmployeeDetail } from "@/lib/types";

type SelectionState = "idle" | "loading" | "ready" | "error";

type SelectionContextValue = {
  detail: HrAdminEmployeeDetail | null;
  dismiss: (href: string) => void;
  error: string;
  retry: () => void;
  selectedId: string | null;
  select: (employeeId: string, href: string, trigger: HTMLAnchorElement) => void;
  state: SelectionState;
};

type SelectionProviderProps = {
  canEditEmployees: boolean;
  canManageEmployeeAccess: boolean;
  children: ReactNode;
  initialDetail: HrAdminEmployeeDetail | null;
  initialSelectedId: string | null;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

function useEmployeeSelection() {
  const value = useContext(SelectionContext);
  if (!value) throw new Error("Employee selection controls must be rendered inside EmployeeSelectionProvider.");
  return value;
}

function detailError(payload: unknown) {
  if (payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }
  return "Employee details could not be loaded.";
}

export function EmployeeSelectionProvider({
  canEditEmployees,
  canManageEmployeeAccess,
  children,
  initialDetail,
  initialSelectedId,
}: SelectionProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialCache = useMemo(() => {
    const cache = new Map<string, HrAdminEmployeeDetail>();
    if (initialDetail) cache.set(initialDetail.id, initialDetail);
    return cache;
  }, [initialDetail]);
  const cacheRef = useRef(initialCache);
  const requestRef = useRef<{ controller: AbortController; employeeId: string; id: number } | null>(null);
  const requestSequenceRef = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detail, setDetail] = useState<HrAdminEmployeeDetail | null>(initialDetail);
  const [state, setState] = useState<SelectionState>(initialSelectedId ? (initialDetail ? "ready" : "loading") : "idle");
  const [error, setError] = useState("");
  const selectedIdRef = useRef<string | null>(initialSelectedId);
  const triggerRef = useRef<HTMLAnchorElement | null>(null);

  const loadDetail = useCallback(async (employeeId: string, useCached = true) => {
    const cached = cacheRef.current.get(employeeId);
    if (useCached && cached) {
      requestRef.current?.controller.abort();
      setDetail(cached);
      setError("");
      setState("ready");
      return;
    }

    requestRef.current?.controller.abort();
    const controller = new AbortController();
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    requestRef.current = { controller, employeeId, id: requestId };
    setDetail(null);
    setError("");
    setState("loading");

    try {
      const response = await fetch(`/api/hr-admin/employees/${employeeId}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as HrAdminEmployeeDetail | { detail?: string } | null;
      if (requestRef.current?.id !== requestId || selectedIdRef.current !== employeeId) return;
      if (!response.ok || !payload || !("id" in payload)) throw new Error(detailError(payload));
      cacheRef.current.set(employeeId, payload);
      setDetail(payload);
      setState("ready");
    } catch (nextError) {
      if (controller.signal.aborted || requestRef.current?.id !== requestId || selectedIdRef.current !== employeeId) return;
      setDetail(null);
      setError(nextError instanceof Error ? nextError.message : "Employee details could not be loaded.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (initialDetail) {
      cacheRef.current.set(initialDetail.id, initialDetail);
    } else if (initialSelectedId) {
      void loadDetail(initialSelectedId);
    }
  }, [initialDetail, initialSelectedId, loadDetail]);

  const select = useCallback((employeeId: string, href: string, trigger: HTMLAnchorElement) => {
    triggerRef.current = trigger;
    // This ref guards async responses before React commits the selected row state.
    selectedIdRef.current = employeeId;
    setSelectedId(employeeId);
    void loadDetail(employeeId);
    // Next integrates native history with useSearchParams; selection data has its own scoped read.
    window.history.pushState(null, "", href);
  }, [loadDetail]);

  const dismiss = useCallback((href: string) => {
    const selected = selectedIdRef.current;
    const trigger = triggerRef.current?.isConnected ? triggerRef.current : selected
      ? document.querySelector<HTMLAnchorElement>(`tr[data-employee-id="${CSS.escape(selected)}"] .employee-directory-table__identity`)
      : null;
    requestRef.current?.controller.abort();
    selectedIdRef.current = null;
    setSelectedId(null);
    setDetail(null);
    setError("");
    setState("idle");
    window.history.pushState(null, "", href);
    const returnTarget = trigger ?? document.querySelector<HTMLElement>(".employee-directory-table-wrap");
    returnTarget?.focus({preventScroll:true});
    returnTarget?.scrollIntoView({block:"nearest"});
  }, []);

  const retry = useCallback(() => {
    if (selectedIdRef.current) void loadDetail(selectedIdRef.current, false);
  }, [loadDetail]);

  /* eslint-disable react-hooks/set-state-in-effect -- URL history is an external selection source. */
  useEffect(() => {
    const nextSelectedId = searchParams.get("employeeId");
    if (nextSelectedId === selectedIdRef.current) return;
    // URL changes are the external source of truth for browser Back/Forward navigation.
    selectedIdRef.current = nextSelectedId;
    setSelectedId(nextSelectedId);
    setError("");
    if (!nextSelectedId) {
      requestRef.current?.controller.abort();
      setDetail(null);
      setState("idle");
      return;
    }
    void loadDetail(nextSelectedId);
  }, [loadDetail, pathname, searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => () => requestRef.current?.controller.abort(), []);

  const contextValue = useMemo<SelectionContextValue>(() => ({
    detail,
    dismiss,
    error,
    retry,
    selectedId,
    select,
    state,
  }), [detail, dismiss, error, retry, selectedId, select, state]);

  return (
    <SelectionContext.Provider value={contextValue}>
      <section className={`section employee-master-layout${selectedId ? " employee-master-layout--drawer-open" : " employee-master-layout--drawer-closed"}`}>
        {children}
        {selectedId ? (
          <EmployeeDetailDrawer
            canEditEmployees={canEditEmployees}
            canManageEmployeeAccess={canManageEmployeeAccess}
          />
        ) : null}
      </section>
    </SelectionContext.Provider>
  );
}

export function EmployeeSelectionRow({ children, employeeId }: { children: ReactNode; employeeId: string }) {
  const { selectedId, state } = useEmployeeSelection();
  const selected = selectedId === employeeId;
  return (
    <tr
      aria-busy={selected && state === "loading" ? "true" : undefined}
      className={selected ? "employee-directory-table__row--active" : undefined}
      data-employee-id={employeeId}
      data-selection-state={selected ? state : undefined}
    >
      {children}
    </tr>
  );
}

export function EmployeeSelectionLink({ children, className, employeeId, href }: {
  children: ReactNode;
  className: string;
  employeeId: string;
  href: string;
}) {
  const { selectedId, select, state } = useEmployeeSelection();
  const selected = selectedId === employeeId;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    select(employeeId, href, event.currentTarget);
  }

  return (
    <Link
      data-navigation-mode="document"
      prefetch={false}
      aria-current={selected ? "true" : undefined}
      aria-describedby={selected && state === "loading" ? "employee-detail-loading-status" : undefined}
      className={className}
      href={href}
      onClick={handleClick}
      scroll={false}
    >
      {children}
    </Link>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function detailWarnings(detail: HrAdminEmployeeDetail) {
  const structure = [
    !detail.department && "department missing",
    !detail.designation && "designation missing",
    !detail.branch && "branch missing",
    !detail.location && "location missing",
  ].filter((warning): warning is string => Boolean(warning));
  const requiresAccess = detail.employment_status === "active" || detail.employment_status === "on_notice";
  const access = [
    !detail.has_access && requiresAccess && "active employee has no access",
    detail.has_access && detail.membership_status !== "active" && requiresAccess && "access is not fully active",
    detail.has_access && detail.assigned_role_count === 0 && "access has no assigned roles",
    detail.direct_reports_count > 0 && (!detail.has_access || detail.membership_status !== "active") && "manager access is not ready for active reporting lines",
    !requiresAccess && (detail.has_access || detail.membership_status === "active") && "inactive or exited employee still has active access",
  ].filter((warning): warning is string => Boolean(warning));
  const manager = [
    detail.direct_reports_count > 0 && (detail.employment_status === "inactive" || detail.employment_status === "exited") && "reassign direct reports before finalizing offboarding",
  ].filter((warning): warning is string => Boolean(warning));
  return { access, manager, structure };
}

function statusChipClass(status: string) {
  const tone = status === "active" ? "success" : status === "on_notice" ? "warning" : status === "exited" ? "danger" : "neutral";
  return `record-chip record-chip--${tone} employee-status-chip employee-status-chip--${status.replaceAll("_", "-")}`;
}

function DetailRow({ title, value }: { title: string; value: string }) {
  return <div className="detail-row"><span className="detail-label">{title}</span><span className="detail-value">{value}</span></div>;
}

function DetailSection({ children, title, open = false }: { children: ReactNode; title: string; open?: boolean }) {
  return <details className="employee-detail-section" open={open}><summary><span>{title}</span></summary><div className="employee-detail-section__grid">{children}</div></details>;
}

function EmployeeDetailSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="employee-detail-skeleton" data-testid="employee-detail-skeleton" id="employee-detail-loading-status" role="status">
      <span className="sr-only">Loading employee details</span>
      <div aria-hidden="true" className="hr-employee-profile-summary loading-card employee-detail-skeleton__profile">
        <span className="employee-detail-skeleton__avatar" />
        <span className="employee-detail-skeleton__copy"><i /><i /></span>
      </div>
      <div aria-hidden="true" className="employee-detail-skeleton__pills"><i /><i /><i /></div>
      {[0, 1, 2].map((section) => (
        <div aria-hidden="true" className="employee-detail-skeleton__section" key={section}>
          <i />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}

function EmployeeDetailContent({ detail }: { detail: HrAdminEmployeeDetail }) {
  const warnings = detailWarnings(detail);
  const allWarnings = [...warnings.structure, ...warnings.access, ...warnings.manager];
  return (
    <>
      <div className="hr-employee-profile-summary">
        <div className="hr-employee-avatar" aria-hidden="true">{detail.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
        <div><p>{detail.employee_code} • {detail.department || "No department"} • {detail.designation || "No designation"}</p></div>
        <span className={statusChipClass(detail.employment_status)}>{label(detail.employment_status)}</span>
      </div>
      <div className="hr-employee-readiness-strip">
        <span className={warnings.structure.length ? "hr-employee-readiness-pill hr-employee-readiness-pill--warn" : "hr-employee-readiness-pill"}>Structure {warnings.structure.length ? "review" : "ready"}</span>
        <span className={warnings.access.length ? "hr-employee-readiness-pill hr-employee-readiness-pill--warn" : "hr-employee-readiness-pill"}>Access {warnings.access.length ? "review" : "ready"}</span>
        <span className={warnings.manager.length ? "hr-employee-readiness-pill hr-employee-readiness-pill--warn" : "hr-employee-readiness-pill"}>Manager chain {warnings.manager.length ? "review" : "ready"}</span>
      </div>
      {allWarnings.length ? (
        <div className="platform-validation-strip platform-validation-strip--warning">
          <strong>{allWarnings.length} readiness item{allWarnings.length === 1 ? "" : "s"} need review</strong>
          <span>{allWarnings.slice(0, 3).map((warning) => `${warning[0].toUpperCase()}${warning.slice(1)}`).join(". ")}.</span>
        </div>
      ) : null}
      <div className="employee-detail-stack">
        <DetailSection title="Profile" open>
          <DetailRow title="Employee" value={`${detail.full_name} (${detail.employee_code})`} />
          <DetailRow title="Preferred Name" value={detail.preferred_name || "Not available"} />
          <DetailRow title="Employment Status" value={label(detail.employment_status)} />
          <DetailRow title="Work Email" value={detail.work_email || "Not available"} />
          <DetailRow title="Personal Email" value={detail.personal_email || "Not available"} />
          <DetailRow title="Phone Number" value={detail.phone_number || "Not available"} />
        </DetailSection>
        <DetailSection title="Structure" open>
          <DetailRow title="Legal Entity" value={detail.legal_entity || "Not mapped"} />
          <DetailRow title="Branch" value={detail.branch || "Not mapped"} />
          <DetailRow title="Location" value={detail.location || "Not mapped"} />
          <DetailRow title="Business Unit" value={detail.business_unit || "Not mapped"} />
          <DetailRow title="Department" value={detail.department || "Not mapped"} />
          <DetailRow title="Cost Center" value={detail.cost_center || "Not mapped"} />
          <DetailRow title="Designation" value={detail.designation || "Not mapped"} />
          <DetailRow title="Grade" value={detail.grade || "Not mapped"} />
          <DetailRow title="Employment Type" value={detail.employment_type || "Not mapped"} />
          <DetailRow title="Reporting Manager" value={detail.reporting_manager || "Not assigned"} />
          <DetailRow title="Direct Reports" value={String(detail.direct_reports_count)} />
        </DetailSection>
        <DetailSection title="Access and dates" open>
          <DetailRow title="Access Provisioned" value={detail.has_access ? "Yes" : "No"} />
          <DetailRow title="Membership Status" value={detail.membership_status ? detail.membership_status.replaceAll("_", " ") : "Not provisioned"} />
          <DetailRow title="Assigned Roles" value={String(detail.assigned_role_count)} />
          <DetailRow title="Date of Joining" value={formatDate(detail.date_of_joining)} />
          <DetailRow title="Probation End Date" value={formatDate(detail.probation_end_date)} />
          <DetailRow title="Confirmation Date" value={formatDate(detail.confirmation_date)} />
          <DetailRow title="Last updated (IST)" value={formatDateTime(detail.updated_at)} />
        </DetailSection>
      </div>
    </>
  );
}

function EmployeeDetailDrawer({ canEditEmployees, canManageEmployeeAccess }: {
  canEditEmployees: boolean;
  canManageEmployeeAccess: boolean;
}) {
  const { detail, dismiss, error, retry, selectedId, state } = useEmployeeSelection();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const focusedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId || searchParams.get("action") || searchParams.get("create") === "1" || focusedIdRef.current === selectedId) return;
    focusedIdRef.current = selectedId;
    headingRef.current?.focus({preventScroll:true});
    headingRef.current?.scrollIntoView({block:"start"});
  }, [selectedId, searchParams]);

  function href(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const actionItems = detail ? [
    ...(canManageEmployeeAccess ? [{ href: href({ action: "access", employeeId: detail.id }), title: "Manage access", description: "Review roles, login state, and membership access." }] : []),
    ...(canEditEmployees ? [{ href: href({ action: "bank", employeeId: detail.id }), title: "Manage bank accounts", description: "Maintain employee payout account details." }] : []),
  ] : [];

  return (
    <article aria-busy={state === "loading"} aria-labelledby="employee-master-detail-title" className="record-card panel-card-soft employee-detail-drawer">
      <div className="record-card__header">
        <div className="record-card__title-wrap"><div className="record-card__title"><h2 className="section-heading-soft" id="employee-master-detail-title" ref={headingRef} tabIndex={-1}>{detail?.full_name ?? "Employee details"}</h2></div><p className="section-copy section-copy-soft">Focused detail for the selected employee.</p></div>
        <div className="record-card__actions">
          <Link data-navigation-mode="document" prefetch={false} className="button button--ghost button--compact" href={href({ employeeId: undefined, action: undefined })} scroll={false} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();dismiss(href({employeeId:undefined,action:undefined}));}}}>Close details</Link>
          {detail && (canEditEmployees || canManageEmployeeAccess) ? (
            <div className="employee-detail-primary-actions">
              {canEditEmployees ? <a className="button button--secondary button--compact" data-navigation-mode="document" href={href({ action: "edit", employeeId: detail.id })}>Edit</a> : null}
              <ActionMenu documentNavigation items={actionItems} label="Actions" />
            </div>
          ) : null}
        </div>
      </div>
      <div className="detail-grid-soft">
        {state === "loading" ? <EmployeeDetailSkeleton /> : null}
        {state === "error" ? (
          <div className="notice notice--error employee-detail-error" role="alert">
            <strong>Employee details could not be loaded.</strong>
            <span>{error}</span>
            <button className="button button--secondary button--compact" onClick={retry} type="button">Retry</button>
          </div>
        ) : null}
        {state === "ready" && detail?.id === selectedId ? <EmployeeDetailContent detail={detail} /> : null}
      </div>
    </article>
  );
}
