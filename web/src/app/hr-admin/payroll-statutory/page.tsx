
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import type { ReactNode } from "react";
import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollStatutorySetup } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import type {
  HrAdminEmployeeStatutoryDeclaration,
  HrAdminEmployeeStatutoryDeclarationItem,
  HrAdminEmployeeStatutoryProfile,
  HrAdminPayrollStatutoryComponent,
  HrAdminPayrollStatutoryEmployerRegistration,
  HrAdminPayrollStatutoryFilingCalendar,
  HrAdminPayrollStatutoryPack,
} from "@/lib/types";

import { ComplianceEvidenceStrip } from "../compliance-evidence-strip";
import { PayrollStatutoryCrudConsole } from "./payroll-statutory-crud-console";
import { StatutoryCatalogEditor } from "./statutory-catalog-editor";
import { StatutoryFinanceExport } from "./statutory-finance-export";
import { StatutoryReviewActions } from "./statutory-review-actions";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

type StatutoryTab = "overview" | "declarations" | "compliance" | "catalog" | "actions";
type PageSize = 10 | 25 | 50;

const STATUTORY_TABS: Array<{ key: StatutoryTab; label: string; detail: string }> = [
  { key: "overview", label: "Overview", detail: "Readiness and next steps" },
  { key: "declarations", label: "Declarations", detail: "Employee proof review" },
  { key: "compliance", label: "Compliance", detail: "Registrations and filings" },
  { key: "catalog", label: "Catalog", detail: "Packs and components" },
  { key: "actions", label: "Setup Actions", detail: "Create, import, and edit" },
];

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTab(value: SearchParamValue): StatutoryTab {
  const raw = normalizeParam(value);
  return STATUTORY_TABS.some((tab) => tab.key === raw) ? (raw as StatutoryTab) : "overview";
}

function parsePositiveInteger(value: SearchParamValue, fallback: number) {
  const parsed = Number.parseInt(normalizeParam(value) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePageSize(value: SearchParamValue): PageSize {
  const parsed = parsePositiveInteger(value, 10);
  return parsed === 25 || parsed === 50 ? parsed : 10;
}

function paginate<T>(items: T[], page: number, pageSize: PageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalPages,
  };
}

function statutoryHref(currentParams: Record<string, SearchParamValue>, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams)) {
    const normalized = normalizeParam(value);
    if (normalized) {
      params.set(key, normalized);
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return `/hr-admin/payroll-statutory${query ? `?${query}` : ""}`;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Pending";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: unknown, currency = "INR") {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatDueLabel(daysUntilDue: number | null) {
  if (daysUntilDue === null) {
    return "No due date";
  }
  if (daysUntilDue < 0) {
    return `${Math.abs(daysUntilDue)} days overdue`;
  }
  if (daysUntilDue === 0) {
    return "Due today";
  }
  return `${daysUntilDue} days left`;
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{label || titleCase(status)}</span>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="payroll-setup-empty-state">
      <strong>{title}</strong>
      <span>{detail}</span>
      {action}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function PayrollStatutoryTabs({ activeTab, currentParams }: { activeTab: StatutoryTab; currentParams: Record<string, SearchParamValue> }) {
  return (
    <nav aria-label="Statutory compliance sections" className="payroll-setup-tabs">
      {STATUTORY_TABS.map((tab) => (
        <Link
          aria-current={activeTab === tab.key ? "page" : undefined}
          className={`payroll-setup-tab ${activeTab === tab.key ? "payroll-setup-tab--active" : ""}`}
          href={statutoryHref(currentParams, { tab: tab.key })}
          key={tab.key}
        >
          <strong>{tab.label}</strong>
          <span>{tab.detail}</span>
        </Link>
      ))}
    </nav>
  );
}

function PaginationControls({
  ariaLabel,
  currentParams,
  page,
  pageParam,
  pageSize,
  pageSizeParam,
  totalPages,
}: {
  ariaLabel: string;
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageParam: string;
  pageSize: PageSize;
  pageSizeParam: string;
  totalPages: number;
}) {
  return (
    <nav aria-label={ariaLabel} className="payroll-setup-pagination">
      <span>{page} of {totalPages}</span>
      <div className="payroll-setup-page-size">
        {[10, 25, 50].map((size) => (
          <Link
            aria-current={pageSize === size ? "page" : undefined}
            className={`payroll-setup-size-link ${pageSize === size ? "is-active" : ""}`}
            href={statutoryHref(currentParams, { [pageSizeParam]: size, [pageParam]: 1 })}
            key={size}
          >
            {size}
          </Link>
        ))}
      </div>
      <div className="payroll-setup-pagination__nav">
        <Link className={`button button--secondary button--compact payroll-setup-pagination__button ${page === 1 ? "is-disabled" : ""}`} href={statutoryHref(currentParams, { [pageParam]: 1 })}>First</Link>
        <Link className={`button button--secondary button--compact payroll-setup-pagination__button ${page === 1 ? "is-disabled" : ""}`} href={statutoryHref(currentParams, { [pageParam]: Math.max(1, page - 1) })}>Previous</Link>
        <Link className={`button button--secondary button--compact payroll-setup-pagination__button ${page === totalPages ? "is-disabled" : ""}`} href={statutoryHref(currentParams, { [pageParam]: Math.min(totalPages, page + 1) })}>Next</Link>
        <Link className={`button button--secondary button--compact payroll-setup-pagination__button ${page === totalPages ? "is-disabled" : ""}`} href={statutoryHref(currentParams, { [pageParam]: totalPages })}>Last</Link>
      </div>
    </nav>
  );
}

function DeclarationRail({
  aggregateOnly,
  currentParams,
  declarations,
  selectedDeclaration,
}: {
  aggregateOnly: boolean;
  currentParams: Record<string, SearchParamValue>;
  declarations: HrAdminEmployeeStatutoryDeclaration[];
  selectedDeclaration: HrAdminEmployeeStatutoryDeclaration | null;
}) {
  return (
    <aside className="payroll-setup-rail payroll-statutory-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Declarations</span>
        <h2>Proof review queue</h2>
      </div>
      <div className="payroll-setup-card-list">
        {declarations.map((declaration) => (
          <Link
            className={`payroll-setup-mini-card payroll-statutory-declaration-card ${selectedDeclaration?.id === declaration.id ? "is-selected" : ""}`}
            href={statutoryHref(currentParams, { tab: "declarations", declarationId: declaration.id })}
            key={declaration.id}
          >
            <div>
              <strong>{aggregateOnly ? `Declaration ${declaration.source_hash.slice(0, 12)}` : declaration.employee_name}</strong>
              <span>
                {aggregateOnly ? declaration.financial_year_code : `${declaration.employee_code} / ${declaration.financial_year_code}`}
              </span>
            </div>
            <StatusBadge status={declaration.status} label={declaration.status_label} />
            <div className="payroll-input-run-card__counts">
              <span>{formatMoney(declaration.declared_total_amount)}</span>
              <span>{declaration.verified_item_count}/{declaration.item_count} verified</span>
            </div>
            <code>{declaration.source_hash.slice(0, 18)}</code>
          </Link>
        ))}
        {declarations.length === 0 ? (
          <div className="empty-state">No statutory declarations are in review yet. Employee declarations will appear here after profiles and proof windows are configured.</div>
        ) : null}
      </div>
    </aside>
  );
}

function DeclarationFilters({
  aggregateOnly,
  currentParams,
  declarations,
}: {
  aggregateOnly: boolean;
  currentParams: Record<string, SearchParamValue>;
  declarations: HrAdminEmployeeStatutoryDeclaration[];
}) {
  const years = [...new Set(declarations.map((item) => item.financial_year_code))].sort().reverse();
  return (
    <form action="/hr-admin/payroll-statutory" className="workspace-card workspace-card--compact" data-navigation-mode="document" method="get">
      <input name="tab" type="hidden" value="declarations" />
      <div className="form-grid form-grid--three">
        <label className="field-shell">
          <span>{aggregateOnly ? "Declaration reference" : "Employee"}</span>
          <input defaultValue={normalizeParam(currentParams.declarationQuery) ?? ""} name="declarationQuery" placeholder={aggregateOnly ? "Pseudonymous reference" : "Name or employee code"} />
        </label>
        <label className="field-shell">
          <span>Financial year</span>
          <select defaultValue={normalizeParam(currentParams.declarationYear) ?? ""} name="declarationYear">
            <option value="">All years</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="field-shell">
          <span>Lifecycle status</span>
          <select defaultValue={normalizeParam(currentParams.declarationStatus) ?? ""} name="declarationStatus">
            <option value="">All statuses</option>
            {["draft", "submitted", "verified", "rejected", "locked"].map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
          </select>
        </label>
        <label className="field-shell">
          <span>Reconciliation</span>
          <select defaultValue={normalizeParam(currentParams.reconciliation) ?? ""} name="reconciliation">
            <option value="">All reconciliation states</option>
            <option value="matched">Matched</option>
            <option value="exception">Exception</option>
          </select>
        </label>
      </div>
      <div className="button-row">
        <button className="button button--primary" type="submit">Apply filters</button>
        <Link className="button button--secondary" href="/hr-admin/payroll-statutory?tab=declarations">Clear filters</Link>
      </div>
    </form>
  );
}

function DeclarationDetail({
  aggregateOnly,
  canLock,
  canReview,
  declaration,
  profile,
  proofItems,
}: {
  aggregateOnly: boolean;
  canLock: boolean;
  canReview: boolean;
  declaration: HrAdminEmployeeStatutoryDeclaration | null;
  profile: HrAdminEmployeeStatutoryProfile | null;
  proofItems: HrAdminEmployeeStatutoryDeclarationItem[];
}) {
  if (!declaration) {
    return (
      <aside className="payroll-setup-detail-panel payroll-statutory-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Declaration detail</span>
          <h2>No declaration selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Employee statutory declarations will appear here once tax proofs enter review.</p>
      </aside>
    );
  }

  return (
    <aside className="payroll-setup-detail-panel payroll-statutory-detail-panel" aria-label={`${declaration.employee_name} declaration detail`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Declaration detail</span>
          <h2>{aggregateOnly ? `Declaration ${declaration.source_hash.slice(0, 12)}` : declaration.employee_name}</h2>
          <p className="section-copy section-copy-soft">
            {aggregateOnly ? `${declaration.financial_year_code} / ${declaration.tax_regime_label}` : `${declaration.employee_code} / ${declaration.financial_year_code} / ${declaration.tax_regime_label}`}
          </p>
        </div>
        <StatusBadge status={declaration.status} label={declaration.status_label} />
      </div>

      <div className="payroll-statutory-total-strip">
        <div>
          <span className="workspace-card__eyebrow">Declared</span>
          <strong>{formatMoney(declaration.declared_total_amount)}</strong>
        </div>
        <div>
          <span className="workspace-card__eyebrow">Verified</span>
          <strong>{formatMoney(declaration.verified_total_amount)}</strong>
        </div>
        <div>
          <span className="workspace-card__eyebrow">Reconciliation</span>
          <strong>{declaration.reconciliation_status === "matched" ? "Matched" : `${formatMoney(declaration.reconciliation_difference)} exception`}</strong>
        </div>
      </div>

      {!aggregateOnly ? <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Profile controls</span>
        <div className="detail-grid">
          <DetailRow label="Pack" value={declaration.statutory_pack_name || "Unassigned"} />
          <DetailRow label="Profile" value={profile?.profile_ref || declaration.declaration_profile_ref} />
          <DetailRow label="PAN" value={profile?.pan_number || "Pending"} />
          <DetailRow label="PF" value={profile?.pf_applicable ? profile.uan_number || "Applicable" : "Not applicable"} />
          <DetailRow label="PT state" value={profile?.professional_tax_state || "Pending"} />
          <DetailRow label="Proof window" value={declaration.proof_window_ref || "Pending"} />
        </div>
      </section> : (
        <section className="payroll-rule-source-card">
          <span className="workspace-card__eyebrow">Finance reconciliation boundary</span>
          <p className="section-copy section-copy-soft">This view contains locked declaration totals only. Employee identifiers, PAN, and private proof evidence remain restricted to HR statutory review.</p>
          <div className="detail-grid">
            <DetailRow label="Reconciliation" value={titleCase(declaration.reconciliation_status)} />
            <DetailRow label="Difference" value={formatMoney(declaration.reconciliation_difference)} />
            <DetailRow label="Exceptions" value={declaration.exception_count} />
          </div>
        </section>
      )}

      {!aggregateOnly ? <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Proof checks</span>
        <div className="payroll-statutory-proof-list">
          {proofItems.map((item) => (
            <article className="payroll-statutory-proof-card" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.section_code} / {item.component_code || item.item_kind_label}
                </span>
              </div>
              <StatusBadge status={item.proof_status} label={item.proof_status_label} />
              <div className="payroll-statutory-proof-amounts">
                <span>{formatMoney(item.declared_amount)}</span>
                <span>{formatMoney(item.verified_amount)}</span>
              </div>
              <code>{item.source_hash.slice(0, 18)}</code>
            </article>
          ))}
          {proofItems.length === 0 ? (
            <div className="empty-state">No proof rows are attached to this declaration yet.</div>
          ) : null}
        </div>
      </section> : null}

      {canReview && !aggregateOnly ? <StatutoryReviewActions canLock={canLock} declaration={declaration} proofItems={proofItems} /> : null}

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Audit timeline</span>
        <div className="detail-grid">
          <DetailRow label="Created" value={formatDate(declaration.created_at)} />
          <DetailRow label="Submitted" value={`${formatDate(declaration.submitted_at)}${!aggregateOnly && declaration.submitted_by_name ? ` by ${declaration.submitted_by_name}` : ""}`} />
          <DetailRow label="Verified" value={`${formatDate(declaration.verified_at)}${!aggregateOnly && declaration.verified_by_name ? ` by ${declaration.verified_by_name}` : ""}`} />
          {declaration.rejected_at ? <DetailRow label="Returned" value={`${formatDate(declaration.rejected_at)}${!aggregateOnly && declaration.rejected_by_name ? ` by ${declaration.rejected_by_name}` : ""}`} /> : null}
          <DetailRow label="Locked" value={`${formatDate(declaration.locked_at)}${!aggregateOnly && declaration.locked_by_name ? ` by ${declaration.locked_by_name}` : ""}`} />
          <DetailRow label="Source" value={<code>{declaration.source_hash}</code>} />
        </div>
        {!aggregateOnly && proofItems.length > 0 ? <div className="payroll-statutory-proof-list">{proofItems.map((item) => (
          <div className="payroll-statutory-proof-card" key={`timeline-${item.id}`}>
            <div><strong>{item.name}</strong><span>{item.proof_status_label}</span></div>
            <span>{formatDate(item.verified_at ?? item.rejected_at ?? item.proof_submitted_at)}</span>
            {item.rejection_reason ? <span>{item.rejection_reason}</span> : null}
          </div>
        ))}</div> : null}
      </section>
    </aside>
  );
}

function ComponentRegister({
  components,
  currentParams,
  page,
  pageSize,
}: {
  components: HrAdminPayrollStatutoryComponent[];
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageSize: PageSize;
}) {
  const paged = paginate(components, page, pageSize);

  return (
    <section className="payroll-statutory-component-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Configuration</span>
          <h2>Statutory component catalog</h2>
        </div>
        <span className="payroll-setup-count">{components.length} components</span>
      </div>
      <div className="payroll-statutory-component-grid">
        {paged.items.map((component) => (
          <article className="payroll-statutory-component-card" key={component.id}>
            <div>
              <strong>{component.name}</strong>
              <span>{component.statutory_pack_name}</span>
            </div>
            <div className="payroll-statutory-component-meta">
              <StatusBadge status={component.status} label={component.status_label} />
              <span>{component.calculation_method_label}</span>
              <span>{component.contribution_owner_label}</span>
            </div>
            <code>{component.statutory_treatment_ref}</code>
          </article>
        ))}
        {components.length === 0 ? (
          <EmptyState title="No statutory components" detail="Add PF, ESI, PT, TDS, or other statutory components before payroll calculation uses this module." />
        ) : null}
      </div>
      {components.length ? (
        <PaginationControls
          ariaLabel="statutory components pagination"
          currentParams={currentParams}
          page={paged.page}
          pageParam="componentPage"
          pageSize={paged.pageSize}
          pageSizeParam="componentSize"
          totalPages={paged.totalPages}
        />
      ) : null}
    </section>
  );
}

function EmployerRegistrationPanel({
  currentParams,
  page,
  pageSize,
  registrations,
}: {
  currentParams: Record<string, SearchParamValue>;
  page: number;
  pageSize: PageSize;
  registrations: HrAdminPayrollStatutoryEmployerRegistration[];
}) {
  const paged = paginate(registrations, page, pageSize);

  return (
    <section className="payroll-statutory-operations-panel" aria-label="Employer statutory registrations">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Employer accounts</span>
          <h2>Registration coverage</h2>
        </div>
        <span className="payroll-setup-count">{registrations.length} registrations</span>
      </div>
      <div className="payroll-statutory-operations-grid">
        {paged.items.map((registration) => (
          <article className="payroll-statutory-registration-card" key={registration.id}>
            <div>
              <strong>{registration.name}</strong>
              <span>{registration.legal_entity_name || registration.statutory_pack_name}</span>
            </div>
            <div className="payroll-statutory-registration-meta">
              <StatusBadge status={registration.status} label={registration.status_label} />
              <span>{registration.registration_number}</span>
              <span>{registration.open_filing_calendar_count}/{registration.filing_calendar_count} open</span>
            </div>
            <code>{registration.registration_type_ref}</code>
          </article>
        ))}
        {registrations.length === 0 ? (
          <EmptyState title="No registrations" detail="Add registrations to enable filing calendars and compliance handoff evidence." />
        ) : null}
      </div>
      {registrations.length ? (
        <PaginationControls
          ariaLabel="employer statutory registrations pagination"
          currentParams={currentParams}
          page={paged.page}
          pageParam="registrationPage"
          pageSize={paged.pageSize}
          pageSizeParam="registrationSize"
          totalPages={paged.totalPages}
        />
      ) : null}
    </section>
  );
}

function FilingCalendarPanel({
  currentParams,
  filingCalendars,
  page,
  pageSize,
}: {
  currentParams: Record<string, SearchParamValue>;
  filingCalendars: HrAdminPayrollStatutoryFilingCalendar[];
  page: number;
  pageSize: PageSize;
}) {
  const paged = paginate(filingCalendars, page, pageSize);

  return (
    <section className="payroll-statutory-operations-panel" aria-label="Statutory filing calendar">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Compliance calendar</span>
          <h2>Upcoming filing obligations</h2>
        </div>
        <span className="payroll-setup-count">{filingCalendars.length} filings</span>
      </div>
      <div className="payroll-statutory-operations-grid">
        {paged.items.map((filing) => (
          <article className="payroll-statutory-filing-card" key={filing.id}>
            <div>
              <strong>{filing.name}</strong>
              <span>{filing.employer_registration_number || filing.statutory_pack_name}</span>
            </div>
            <div className="payroll-statutory-filing-meta">
              <StatusBadge status={filing.status} label={filing.status_label} />
              <span>{formatDate(filing.due_date)}</span>
              <span>{formatDueLabel(filing.days_until_due)}</span>
            </div>
            <code>{filing.output_profile_ref || filing.filing_type_ref}</code>
          </article>
        ))}
        {filingCalendars.length === 0 ? (
          <EmptyState title="No filing calendar" detail="Add due dates before compliance reports can prove filing readiness." />
        ) : null}
      </div>
      {filingCalendars.length ? (
        <PaginationControls
          ariaLabel="statutory filing calendar pagination"
          currentParams={currentParams}
          page={paged.page}
          pageParam="filingPage"
          pageSize={paged.pageSize}
          pageSizeParam="filingSize"
          totalPages={paged.totalPages}
        />
      ) : null}
    </section>
  );
}

function readConfigString(config: Record<string, unknown>, keys: string[], fallback = "Not configured") {
  for (const key of keys) {
    const value = config[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return fallback;
}

function TdsComplianceReport({
  components,
  filingCalendars,
  employeeProfiles,
  declarations,
}: {
  components: HrAdminPayrollStatutoryComponent[];
  filingCalendars: HrAdminPayrollStatutoryFilingCalendar[];
  employeeProfiles: HrAdminEmployeeStatutoryProfile[];
  declarations: HrAdminEmployeeStatutoryDeclaration[];
}) {
  const tdsComponents = components.filter((component) => component.statutory_type === "tax_deducted_at_source");
  const tdsFilings = filingCalendars.filter((filing) => {
    const marker = `${filing.filing_type_ref} ${filing.output_profile_ref} ${filing.name} ${filing.code}`.toLowerCase();
    return filing.statutory_type === "tax_deducted_at_source" || marker.includes("tds") || marker.includes("24q") || marker.includes("form_24q");
  });
  const panReady = employeeProfiles.filter((profile) => profile.pan_number.trim()).length;
  const taxRegimeReady = employeeProfiles.filter((profile) => profile.tax_regime !== "not_declared").length;
  const lockedDeclarations = declarations.filter((declaration) => declaration.status === "locked");
  const reportConfig = tdsFilings[0]?.config_snapshot ?? tdsComponents[0]?.config_snapshot ?? {};
  const formRef = readConfigString(reportConfig, ["form_ref", "form_reference", "tds_form_ref"], "india.tds.form_24q.configurable");
  const fvuProfileRef = readConfigString(reportConfig, ["fvu_profile_ref", "efile_profile_ref", "validation_profile_ref"], "tds.fvu.validation.profile.pending");
  const challanStrategyRef = readConfigString(reportConfig, ["challan_strategy_ref", "challan_mapping_ref"], "tds.challan.mapping.pending");
  const providerRouteRef = tdsFilings.find((filing) => filing.provider_ref)?.provider_ref || readConfigString(reportConfig, ["provider_route_ref"], "tds.provider.route.pending");
  const readinessItems = [
    { label: "TDS component", ready: tdsComponents.some((component) => component.status === "active"), value: `${tdsComponents.length} configured` },
    { label: "Form 24Q calendar", ready: tdsFilings.length > 0, value: `${tdsFilings.length} obligations` },
    { label: "PAN coverage", ready: employeeProfiles.length > 0 && panReady === employeeProfiles.length, value: `${panReady}/${employeeProfiles.length}` },
    { label: "Tax regime", ready: employeeProfiles.length > 0 && taxRegimeReady === employeeProfiles.length, value: `${taxRegimeReady}/${employeeProfiles.length}` },
    { label: "Proof lock", ready: lockedDeclarations.length > 0, value: `${lockedDeclarations.length}/${declarations.length}` },
    { label: "Provider route", ready: providerRouteRef !== "tds.provider.route.pending", value: providerRouteRef },
  ];
  const readyCount = readinessItems.filter((item) => item.ready).length;

  return (
    <section className="payroll-statutory-operations-panel" aria-label="TDS compliance report">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">India payroll compliance</span>
          <h2>TDS e-file report</h2>
        </div>
        <span className="payroll-setup-count">{readyCount}/{readinessItems.length} checks ready</span>
      </div>

      <div className="payroll-statutory-operations-grid" data-testid="tds-compliance-report">
        <article className="payroll-statutory-filing-card">
          <div>
            <strong>Return profile</strong>
            <span>Quarterly salary TDS report package</span>
          </div>
          <div className="detail-grid">
            <DetailRow label="Form reference" value={<code>{formRef}</code>} />
            <DetailRow label="FVU profile" value={<code>{fvuProfileRef}</code>} />
            <DetailRow label="Challan mapping" value={<code>{challanStrategyRef}</code>} />
            <DetailRow label="Provider route" value={<code>{providerRouteRef}</code>} />
          </div>
        </article>

        <article className="payroll-statutory-filing-card">
          <div>
            <strong>Deductee coverage</strong>
            <span>PAN, tax regime, and proof lock readiness</span>
          </div>
          <div className="payroll-statutory-filing-meta">
            <span>{panReady}/{employeeProfiles.length} PAN ready</span>
            <span>{taxRegimeReady}/{employeeProfiles.length} regimes</span>
            <span>{lockedDeclarations.length}/{declarations.length} declarations locked</span>
          </div>
          <code>source:employee_statutory_profiles</code>
        </article>

        {readinessItems.map((item) => (
          <article className="payroll-statutory-filing-card" key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </div>
            <StatusBadge status={item.ready ? "ready" : "warning"} label={item.ready ? "Ready" : "Needs setup"} />
          </article>
        ))}
      </div>

      <div className="notice">
        <strong>Production filing guard.</strong>
        <span className="muted">
          This report certifies tenant data readiness for TDS e-file generation. Final Form 24Q/FVU file output and TRACES/TIN submission must be enabled through configured provider packages and separately certified against official utilities.
        </span>
        <Link className="button button--secondary" href="/api/hr-admin/reports/tds-efile-package" prefetch={false}>
          Download TDS e-file package
        </Link>
      </div>
    </section>
  );
}

function PackSummary({ pack }: { pack: HrAdminPayrollStatutoryPack | null }) {
  if (!pack) {
    return null;
  }
  return (
    <section className="payroll-rule-source-card payroll-statutory-pack-card">
      <div>
        <span className="workspace-card__eyebrow">Active pack</span>
        <strong>{pack.name}</strong>
      </div>
      <div className="payroll-statutory-pack-meta">
        <span>{pack.country_code}</span>
        <span>{pack.currency_code}</span>
        <span>{formatDate(pack.effective_from)} - {formatDate(pack.effective_to)}</span>
        <span>{pack.component_count} components</span>
      </div>
      <code>{pack.validation_profile_ref}</code>
    </section>
  );
}

function DeclarationTable({
  aggregateOnly,
  currentParams,
  declarations,
  page,
  pageSize,
}: {
  aggregateOnly: boolean;
  currentParams: Record<string, SearchParamValue>;
  declarations: HrAdminEmployeeStatutoryDeclaration[];
  page: number;
  pageSize: PageSize;
}) {
  const paged = paginate(declarations, page, pageSize);

  return (
    <section className="payroll-setup-main-panel payroll-statutory-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Review register</span>
          <h2>Declarations and proof evidence</h2>
          <p className="section-copy section-copy-soft">Check employee tax regime, declared value, verified value, and proof coverage before payroll consumes statutory inputs.</p>
        </div>
        <span className="payroll-setup-count">{declarations.length} declarations</span>
      </div>

      <WorkspaceTableScrollRegion label="Payroll statutory table 1" className="payroll-table-scroll payroll-table-scroll--compact payroll-statutory-table-shell workspace-table-region">
        <table className="payroll-readiness-table payroll-statutory-table payroll-setup-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Year</th>
              <th>Status</th>
              <th>Tax Regime</th>
              <th>Declared</th>
              <th>Verified</th>
              <th>Proofs</th>
            </tr>
          </thead>
          <tbody>
            {paged.items.length ? (
              paged.items.map((declaration) => (
                <tr key={declaration.id}>
                  <td>
                    <Link href={statutoryHref(currentParams, { tab: "declarations", declarationId: declaration.id })}>
                      {aggregateOnly ? `Declaration ${declaration.source_hash.slice(0, 12)}` : declaration.employee_name}
                    </Link>
                    {!aggregateOnly ? <span className="table-cell-subtitle">{declaration.employee_code}</span> : null}
                  </td>
                  <td>{declaration.financial_year_code}</td>
                  <td><StatusBadge status={declaration.status} label={declaration.status_label} /></td>
                  <td>{declaration.tax_regime_label}</td>
                  <td>{formatMoney(declaration.declared_total_amount)}</td>
                  <td>{formatMoney(declaration.verified_total_amount)}</td>
                  <td>{declaration.verified_item_count}/{declaration.item_count}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <EmptyState title="No declarations yet" detail="Employee statutory declarations will appear here after proof windows and profiles are configured." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </WorkspaceTableScrollRegion>
      <PaginationControls
        ariaLabel="statutory declaration pagination"
        currentParams={currentParams}
        page={paged.page}
        pageParam="declarationPage"
        pageSize={paged.pageSize}
        pageSizeParam="declarationSize"
        totalPages={paged.totalPages}
      />
    </section>
  );
}

function OverviewPanel({
  activePack,
  currentParams,
  setup,
}: {
  activePack: HrAdminPayrollStatutoryPack | null;
  currentParams: Record<string, SearchParamValue>;
  setup: Awaited<ReturnType<typeof getHrAdminPayrollStatutorySetup>>["data"];
}) {
  const hasSetupCoverage = setup.summary.active_pack_count > 0 && setup.summary.active_statutory_component_count > 0 && setup.summary.active_employer_registration_count > 0;
  const hasProofCoverage = setup.summary.declaration_count === 0 || setup.summary.locked_declaration_count > 0;
  const hasFilingRisk = setup.summary.due_filing_calendar_count > 0;

  return (
    <div className="payroll-setup-overview-grid">
      <section className="payroll-setup-main-panel">
        <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
          <div>
            <span className="workspace-card__eyebrow">Current decision</span>
            <h2>{hasSetupCoverage && hasProofCoverage && !hasFilingRisk ? "Statutory setup is ready" : "Review statutory gaps before payroll close"}</h2>
            <p className="section-copy section-copy-soft">Start here for statutory health. Open focused tabs only when you need proof review, compliance dates, component catalog, or maintenance forms.</p>
          </div>
          <StatusBadge status={hasSetupCoverage && hasProofCoverage && !hasFilingRisk ? "ready" : "warning"} label={hasSetupCoverage && hasProofCoverage && !hasFilingRisk ? "Ready" : "Review"} />
        </div>
        <div className="payroll-setup-summary-grid">
          <article className="payroll-setup-summary-card">
            <span>Setup coverage</span>
            <strong>{hasSetupCoverage ? "Ready" : "Needs setup"}</strong>
            <p>{setup.summary.active_pack_count} packs, {setup.summary.active_statutory_component_count} components, {setup.summary.active_employer_registration_count} registrations.</p>
          </article>
          <article className="payroll-setup-summary-card">
            <span>Proof review</span>
            <strong>{setup.summary.locked_declaration_count}/{setup.summary.declaration_count}</strong>
            <p>Locked declarations are safe for calculation and audit evidence.</p>
          </article>
          <article className="payroll-setup-summary-card">
            <span>Filing calendar</span>
            <strong>{setup.summary.due_filing_calendar_count}</strong>
            <p>Due filing rows need compliance owner attention.</p>
          </article>
        </div>
        <div className="payroll-setup-action-strip">
          <Link className="button button--secondary" href={statutoryHref(currentParams, { tab: "declarations" })}>
            Review declarations
          </Link>
          <Link className="button button--secondary" href={statutoryHref(currentParams, { tab: "compliance" })}>
            Open compliance
          </Link>
          <Link className="button button--primary" href={statutoryHref(currentParams, { tab: "actions" })}>
            Setup actions
          </Link>
        </div>
      </section>

      <PackSummary pack={activePack} />
      <TdsComplianceReport
        components={setup.statutory_components}
        declarations={setup.declarations}
        employeeProfiles={setup.employee_profiles}
        filingCalendars={setup.filing_calendars}
      />
    </div>
  );
}

export default async function HrAdminPayrollStatutoryPage({ searchParams }: PageProps) {
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["statutory.setup.view", "statutory.setup.manage", "statutory.declarations.view", "statutory.declarations.manage", "payroll.review", "payroll.approve"],
    fallbackPath: "/hr-admin",
  });
  const canManageStatutorySetup = !sessionUser || sessionHasPermission(sessionUser, "statutory.setup.manage");
  const canManageStatutoryDeclarations = !sessionUser || sessionHasPermission(sessionUser, "statutory.declarations.manage");
  const canLockStatutoryDeclarations = !sessionUser || sessionHasPermission(sessionUser, "payroll.approve");
  const financeReadOnly = Boolean(sessionUser && !canManageStatutoryDeclarations && (sessionHasPermission(sessionUser, "payroll.review") || canLockStatutoryDeclarations));
  const currentParams = (await searchParams) ?? {};
  const activeTab = normalizeTab(currentParams.tab);
  const declarationPage = parsePositiveInteger(currentParams.declarationPage, 1);
  const declarationSize = normalizePageSize(currentParams.declarationSize);
  const componentPage = parsePositiveInteger(currentParams.componentPage, 1);
  const componentSize = normalizePageSize(currentParams.componentSize);
  const registrationPage = parsePositiveInteger(currentParams.registrationPage, 1);
  const registrationSize = normalizePageSize(currentParams.registrationSize);
  const filingPage = parsePositiveInteger(currentParams.filingPage, 1);
  const filingSize = normalizePageSize(currentParams.filingSize);
  const selectedDeclarationId = normalizeParam(currentParams.declarationId);
  const result = await getHrAdminPayrollStatutorySetup();
  const setup = result.data;
  const declarationQuery = (normalizeParam(currentParams.declarationQuery) ?? "").trim().toLowerCase();
  const declarationYear = normalizeParam(currentParams.declarationYear) ?? "";
  const declarationStatus = normalizeParam(currentParams.declarationStatus) ?? "";
  const reconciliation = normalizeParam(currentParams.reconciliation) ?? "";
  const roleVisibleDeclarations = financeReadOnly ? setup.declarations.filter((item) => item.status === "locked") : setup.declarations;
  const visibleDeclarations = roleVisibleDeclarations.filter((item) => {
    const searchable = `${item.employee_name} ${item.employee_code} ${item.source_hash.slice(0, 12)}`.toLowerCase();
    return (!declarationQuery || searchable.includes(declarationQuery))
      && (!declarationYear || item.financial_year_code === declarationYear)
      && (!declarationStatus || item.status === declarationStatus)
      && (!reconciliation || item.reconciliation_status === reconciliation);
  });
  const selectedDeclaration =
    visibleDeclarations.find((item) => item.id === selectedDeclarationId) ??
    visibleDeclarations[0] ??
    null;
  const selectedProfile = selectedDeclaration
    ? setup.employee_profiles.find((item) => item.id === selectedDeclaration.employee_statutory_profile_id) ?? null
    : null;
  const selectedProofItems = selectedDeclaration
    ? setup.declaration_items.filter((item) => item.declaration_id === selectedDeclaration.id)
    : [];
  const activePack = setup.packs.find((item) => item.status === "active") ?? setup.packs[0] ?? null;

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory accerio-page">
      <PageIntro appearance="accerio"
        eyebrow={result.state === "live" ? "Live compliance workspace" : "Demo compliance workspace"}
        title="Statutory Compliance"
        description="Manage statutory packs, employer registrations, employee declarations, proof review, and filing readiness from one controlled workspace."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href={statutoryHref(currentParams, { tab: "declarations" })}>
              Declarations
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports/statutory-filing-status">
              Filing status
            </Link>
            <Link className="button button--primary" href="/hr-admin/reports/compliance">
              Compliance reports
            </Link>
          </>
        }
      />

      <ComplianceEvidenceStrip
        current="statutory"
        eyebrow="Statutory compliance"
        title="Statutory evidence control"
        description="Track packs, employer registrations, employee profiles, declarations, proof verification, and due filing calendars from one statutory evidence path."
        metrics={[
          { label: "active packs", value: setup.summary.active_pack_count, tone: setup.summary.active_pack_count ? "ready" : "warning" },
          { label: "due filings", value: setup.summary.due_filing_calendar_count, tone: setup.summary.due_filing_calendar_count ? "warning" : "ready" },
          { label: "declarations", value: setup.summary.declaration_count, tone: "neutral" },
          { label: "proofs verified", value: setup.summary.verified_declaration_item_count, tone: "ready" },
        ]}
      />

      <section className="section section--tight" aria-label="Statutory compliance metrics">
        <div className="attendance-summary-strip payroll-run-summary-strip" aria-label="Statutory compliance summary">
          <span><strong>{setup.summary.active_statutory_component_count}</strong> components</span>
          <span><strong>{setup.summary.active_employee_profile_count}</strong> profiles</span>
          <span><strong>{setup.summary.active_employer_registration_count}</strong> registrations</span>
          <span><strong>{setup.summary.locked_declaration_count}</strong> locked</span>
        </div>
      </section>

      <PayrollStatutoryTabs activeTab={activeTab} currentParams={currentParams} />

      {activeTab === "overview" ? (
        <OverviewPanel activePack={activePack} currentParams={currentParams} setup={setup} />
      ) : null}

      {activeTab === "declarations" ? (
        <div className="stack-list">
          {financeReadOnly ? <section className="workspace-card workspace-card--compact"><div className="workspace-card__header"><div><span className="workspace-card__eyebrow">Finance reconciliation</span><h2>Locked statutory totals</h2><p className="section-copy section-copy-soft">Export contains pseudonymous declaration references and locked totals only.</p></div><StatutoryFinanceExport declarations={visibleDeclarations} /></div></section> : null}
          <DeclarationFilters aggregateOnly={financeReadOnly} currentParams={currentParams} declarations={roleVisibleDeclarations} />
          <section className="payroll-setup-workspace payroll-statutory-workspace">
            <DeclarationRail aggregateOnly={financeReadOnly} currentParams={currentParams} declarations={visibleDeclarations} selectedDeclaration={selectedDeclaration} />
            <DeclarationTable
              aggregateOnly={financeReadOnly}
              currentParams={currentParams}
              declarations={visibleDeclarations}
              page={declarationPage}
              pageSize={declarationSize}
            />
            <DeclarationDetail
              aggregateOnly={financeReadOnly}
              canLock={canLockStatutoryDeclarations}
              canReview={canManageStatutoryDeclarations}
              declaration={selectedDeclaration}
              profile={selectedProfile}
              proofItems={financeReadOnly ? [] : selectedProofItems}
            />
          </section>
        </div>
      ) : null}

      {activeTab === "compliance" ? (
        <div className="payroll-setup-grid-two">
          <TdsComplianceReport
            components={setup.statutory_components}
            declarations={setup.declarations}
            employeeProfiles={setup.employee_profiles}
            filingCalendars={setup.filing_calendars}
          />
          <EmployerRegistrationPanel
            currentParams={currentParams}
            page={registrationPage}
            pageSize={registrationSize}
            registrations={setup.employer_registrations}
          />
          <FilingCalendarPanel
            currentParams={currentParams}
            filingCalendars={setup.filing_calendars}
            page={filingPage}
            pageSize={filingSize}
          />
        </div>
      ) : null}

      {activeTab === "catalog" ? (
        <div className="stack-list">
          <StatutoryCatalogEditor canApprove={canLockStatutoryDeclarations} canManage={canManageStatutorySetup} itemKindOptions={setup.options.statutory_declaration_item_kinds} packs={setup.packs} />
          <div className="payroll-setup-grid-two">
            <PackSummary pack={activePack} />
            <ComponentRegister
              components={setup.statutory_components}
              currentParams={currentParams}
              page={componentPage}
              pageSize={componentSize}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "actions" ? (
        <PayrollStatutoryCrudConsole
          canLockDeclarations={canLockStatutoryDeclarations}
          canManageDeclarations={canManageStatutoryDeclarations}
          canManageSetup={canManageStatutorySetup}
          initialSetup={setup}
        />
      ) : null}
    </main>
  );
}
