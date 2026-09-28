import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminSalarySetup } from "@/lib/api";
import type {
  HrAdminEmployeeSalaryAssignment,
  HrAdminSalaryComponent,
  HrAdminSalaryStructure,
  HrAdminSalaryStructureComponent,
  HrAdminSalaryStructureVersion,
} from "@/lib/types";
import { SalarySetupCrudConsole } from "./salary-setup-crud-console";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};
type SalaryTab = "overview" | "components" | "structures" | "assignments" | "actions";
type PaginationPatch = Record<string, string | number | null | undefined>;

const SALARY_TABS: Array<{ id: SalaryTab; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Salary setup coverage" },
  { id: "components", label: "Components", description: "Earnings, deductions, rules" },
  { id: "structures", label: "Structures", description: "Versions and component lines" },
  { id: "assignments", label: "Assignments", description: "Employee salary coverage" },
  { id: "actions", label: "Setup Actions", description: "Create, edit, and import" },
];
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTab(value: SearchParamValue): SalaryTab {
  const tab = normalizeParam(value);
  return SALARY_TABS.some((item) => item.id === tab) ? (tab as SalaryTab) : "overview";
}

function parsePositiveInteger(value: SearchParamValue, fallback: number) {
  const parsed = Number.parseInt(normalizeParam(value) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePageSize(value: SearchParamValue, fallback = 10) {
  const parsed = parsePositiveInteger(value, fallback);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : fallback;
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  return {
    currentPage,
    totalPages,
    pageItems: items.slice(startIndex, startIndex + pageSize),
  };
}

function salaryHref(params: Record<string, SearchParamValue>, patch: PaginationPatch = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized) {
      query.set(key, normalized);
    }
  });
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      query.delete(key);
      return;
    }
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `/hr-admin/salary-setup?${serialized}` : "/hr-admin/salary-setup";
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatMoney(value: string | null) {
  if (!value) {
    return "Not set";
  }
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return value;
  }
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "INR",
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Open";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function SnapshotRows({ snapshot }: { snapshot: Record<string, unknown> }) {
  const entries = Object.entries(snapshot).slice(0, 5);
  if (!entries.length) {
    return <span className="muted">No custom configuration</span>;
  }
  return (
    <div className="payroll-setup-snapshot">
      {entries.map(([key, value]) => (
        <div className="detail-row" key={key}>
          <span className="detail-label">{titleCase(key)}</span>
          <span className="detail-value">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="payroll-setup-empty-state">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function PaginationControls({
  currentParams,
  page,
  totalPages,
  pageSize,
  total,
  pageParam,
  sizeParam,
  tab,
}: {
  currentParams: Record<string, SearchParamValue>;
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  pageParam: string;
  sizeParam: string;
  tab: SalaryTab;
}) {
  const isFirst = page <= 1;
  const isLast = page >= totalPages;
  const className = "button button--secondary payroll-setup-pagination__button";
  return (
    <div className="payroll-setup-pagination" aria-label={`${tab} pagination`}>
      <span className="payroll-setup-count">{total ? `${page} of ${totalPages}` : "0 records"}</span>
      <div className="payroll-setup-page-size" aria-label="Rows per page">
        {PAGE_SIZE_OPTIONS.map((option) => (
          <Link
            aria-current={pageSize === option ? "page" : undefined}
            className={`payroll-setup-size-link${pageSize === option ? " is-active" : ""}`}
            href={salaryHref(currentParams, { tab, [sizeParam]: option, [pageParam]: 1 })}
            key={option}
          >
            {option}
          </Link>
        ))}
      </div>
      <div className="payroll-setup-pagination__nav">
        <Link aria-disabled={isFirst} className={`${className}${isFirst ? " is-disabled" : ""}`} href={salaryHref(currentParams, { tab, [pageParam]: 1 })}>
          First
        </Link>
        <Link aria-disabled={isFirst} className={`${className}${isFirst ? " is-disabled" : ""}`} href={salaryHref(currentParams, { tab, [pageParam]: Math.max(1, page - 1) })}>
          Previous
        </Link>
        <Link aria-disabled={isLast} className={`${className}${isLast ? " is-disabled" : ""}`} href={salaryHref(currentParams, { tab, [pageParam]: Math.min(totalPages, page + 1) })}>
          Next
        </Link>
        <Link aria-disabled={isLast} className={`${className}${isLast ? " is-disabled" : ""}`} href={salaryHref(currentParams, { tab, [pageParam]: totalPages })}>
          Last
        </Link>
      </div>
    </div>
  );
}

function SalarySetupTabs({ activeTab, currentParams }: { activeTab: SalaryTab; currentParams: Record<string, SearchParamValue> }) {
  return (
    <nav className="payroll-setup-tabs" aria-label="Salary setup sections">
      {SALARY_TABS.map((tab) => (
        <Link
          aria-current={activeTab === tab.id ? "page" : undefined}
          className={`payroll-setup-tab${activeTab === tab.id ? " payroll-setup-tab--active" : ""}`}
          href={salaryHref(currentParams, { tab: tab.id })}
          key={tab.id}
        >
          <strong>{tab.label}</strong>
          <span>{tab.description}</span>
        </Link>
      ))}
    </nav>
  );
}

function ComponentRail({ components, currentParams }: { components: HrAdminSalaryComponent[]; currentParams: Record<string, SearchParamValue> }) {
  return (
    <div className="payroll-setup-rail salary-setup-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Components</span>
        <h2>Catalog</h2>
      </div>
      <div className="salary-component-stack">
        {components.length ? components.slice(0, 8).map((component) => (
          <article className="salary-component-item" key={component.id}>
            <div>
              <strong>{component.name}</strong>
              <span>{component.code}</span>
            </div>
            <div className="payroll-setup-mini-card__meta">
              <span>{component.component_type_label}</span>
              <span>{component.value_type_label}</span>
            </div>
            <div className="salary-component-flags">
              <span>{component.is_taxable ? "Taxable" : "Non-taxable"}</span>
              <span>{component.is_proratable ? "Prorated" : "Fixed period"}</span>
            </div>
          </article>
        )) : (
          <EmptyState title="No salary components" detail="Create components before attaching salary structure lines." />
        )}
      </div>
      <Link className="button button--secondary payroll-setup-rail__action" href={`${salaryHref(currentParams, { tab: "actions" })}#salary-component-form`}>
        Manage components
      </Link>
    </div>
  );
}

function StructureDetail({ structure }: { structure: HrAdminSalaryStructure | null }) {
  if (!structure) {
    return (
      <aside className="payroll-setup-detail-panel salary-setup-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Structure</span>
          <h2>No structure selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Create a salary structure to group component versions and employee salary assignments.</p>
      </aside>
    );
  }

  return (
    <aside className="payroll-setup-detail-panel salary-setup-detail-panel" aria-label={`${structure.name} detail`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Structure</span>
          <h2>{structure.name}</h2>
        </div>
        <StatusBadge status={structure.status} />
      </div>
      <div className="detail-grid">
        <div className="detail-row"><span className="detail-label">Code</span><span className="detail-value">{structure.code}</span></div>
        <div className="detail-row"><span className="detail-label">Pay group</span><span className="detail-value">{structure.pay_group_name || "All groups"}</span></div>
        <div className="detail-row"><span className="detail-label">Currency</span><span className="detail-value">{structure.currency_code}</span></div>
        <div className="detail-row"><span className="detail-label">Versions</span><span className="detail-value">{structure.version_count}</span></div>
        <div className="detail-row"><span className="detail-label">Assignments</span><span className="detail-value">{structure.assignment_count}</span></div>
      </div>
      <div className="payroll-setup-config-block">
        <span className="workspace-card__eyebrow">Configuration snapshot</span>
        <SnapshotRows snapshot={structure.config_snapshot} />
      </div>
    </aside>
  );
}

function ComponentTable({
  components,
  currentParams,
}: {
  components: HrAdminSalaryComponent[];
  currentParams: Record<string, SearchParamValue>;
}) {
  const pageSize = normalizePageSize(currentParams.componentSize);
  const pageData = paginate(components, parsePositiveInteger(currentParams.componentPage, 1), pageSize);
  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Components</span>
          <h2>Component catalog</h2>
          <p>Earnings, deductions, benefits, taxability, proration, and payslip visibility.</p>
        </div>
        <Link className="button button--secondary" href={`${salaryHref(currentParams, { tab: "actions" })}#salary-component-form`}>
          New component
        </Link>
      </div>
      <div className="payroll-table-scroll">
        <table className="payroll-readiness-table payroll-setup-table salary-setup-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Type</th>
              <th>Value</th>
              <th>Tax</th>
              <th>Proration</th>
              <th>Status</th>
              <th>Rule reference</th>
            </tr>
          </thead>
          <tbody>
            {pageData.pageItems.map((component) => (
              <tr key={component.id}>
                <td>
                  <strong>{component.name}</strong>
                  <span>{component.code}</span>
                </td>
                <td>{component.component_type_label}</td>
                <td>{component.value_type_label}</td>
                <td>{component.is_taxable ? "Taxable" : "Non-taxable"}</td>
                <td>{component.is_proratable ? "Prorated" : "Fixed"}</td>
                <td><StatusBadge status={component.status} /></td>
                <td>{component.formula_ref || component.applicability_rule_ref || "Not set"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!components.length ? <EmptyState title="No components yet" detail="Create salary components from Setup Actions." /> : null}
      <PaginationControls
        currentParams={currentParams}
        page={pageData.currentPage}
        pageParam="componentPage"
        pageSize={pageSize}
        sizeParam="componentSize"
        tab="components"
        total={components.length}
        totalPages={pageData.totalPages}
      />
    </section>
  );
}

function StructureTable({
  structures,
  selectedStructure,
  currentParams,
}: {
  structures: HrAdminSalaryStructure[];
  selectedStructure: HrAdminSalaryStructure | null;
  currentParams: Record<string, SearchParamValue>;
}) {
  const pageSize = normalizePageSize(currentParams.structureSize);
  const pageData = paginate(structures, parsePositiveInteger(currentParams.structurePage, 1), pageSize);
  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Salary structures</span>
          <h2>Version matrix</h2>
          <p>Review structure status, pay group scope, active version coverage, and assignment counts.</p>
        </div>
        <Link className="button button--secondary" href={`${salaryHref(currentParams, { tab: "actions" })}#salary-structure-form`}>
          New structure
        </Link>
      </div>
      <div className="payroll-table-scroll">
        <table className="payroll-readiness-table payroll-setup-table salary-setup-table">
          <thead>
            <tr>
              <th>Structure</th>
              <th>Status</th>
              <th>Pay group</th>
              <th>Versions</th>
              <th>Assignments</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            {pageData.pageItems.map((structure) => (
              <tr className={selectedStructure?.id === structure.id ? "is-selected" : ""} key={structure.id}>
                <td>
                  <Link href={salaryHref(currentParams, { tab: "structures", structureId: structure.id })}>
                    <strong>{structure.name}</strong>
                    <span>{structure.code}</span>
                  </Link>
                </td>
                <td><StatusBadge status={structure.status} /></td>
                <td>{structure.pay_group_name || "All groups"}</td>
                <td>{structure.version_count}</td>
                <td>{structure.assignment_count}</td>
                <td>{structure.currency_code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!structures.length ? <EmptyState title="No structures yet" detail="Create structures after components and pay groups are ready." /> : null}
      <PaginationControls
        currentParams={currentParams}
        page={pageData.currentPage}
        pageParam="structurePage"
        pageSize={pageSize}
        sizeParam="structureSize"
        tab="structures"
        total={structures.length}
        totalPages={pageData.totalPages}
      />
    </section>
  );
}

function VersionTable({
  versions,
  currentParams,
}: {
  versions: HrAdminSalaryStructureVersion[];
  currentParams: Record<string, SearchParamValue>;
}) {
  const pageSize = normalizePageSize(currentParams.versionSize);
  const pageData = paginate(versions, parsePositiveInteger(currentParams.versionPage, 1), pageSize);
  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Versions</span>
          <h2>Effective-dated salary versions</h2>
          <p>Validate CTC, active dates, structure version state, component count, and assignment coverage.</p>
        </div>
        <Link className="button button--secondary" href={`${salaryHref(currentParams, { tab: "actions" })}#salary-version-form`}>
          New version
        </Link>
      </div>
      <div className="payroll-table-scroll">
        <table className="payroll-readiness-table payroll-setup-table salary-setup-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Effective</th>
              <th>Annual CTC</th>
              <th>Components</th>
              <th>Assignments</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.pageItems.map((version) => (
              <tr key={version.id}>
                <td>
                  <strong>{version.structure_name}</strong>
                  <span>Version {version.version}</span>
                </td>
                <td>{formatDate(version.effective_from)} - {formatDate(version.effective_to)}</td>
                <td>{formatMoney(version.annual_ctc)}</td>
                <td>{version.component_count}</td>
                <td>{version.assignment_count}</td>
                <td><StatusBadge status={version.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!versions.length ? <EmptyState title="No versions in this view" detail="Create a version after a salary structure exists." /> : null}
      <PaginationControls
        currentParams={currentParams}
        page={pageData.currentPage}
        pageParam="versionPage"
        pageSize={pageSize}
        sizeParam="versionSize"
        tab="structures"
        total={versions.length}
        totalPages={pageData.totalPages}
      />
    </section>
  );
}

function LineTable({
  lines,
  currentParams,
}: {
  lines: HrAdminSalaryStructureComponent[];
  currentParams: Record<string, SearchParamValue>;
}) {
  const pageSize = normalizePageSize(currentParams.lineSize);
  const pageData = paginate(lines, parsePositiveInteger(currentParams.linePage, 1), pageSize);
  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Component lines</span>
          <h2>Structure composition</h2>
          <p>Inspect the earnings and deduction lines attached to the selected structure versions.</p>
        </div>
        <Link className="button button--secondary" href={`${salaryHref(currentParams, { tab: "actions" })}#salary-line-form`}>
          New line
        </Link>
      </div>
      <div className="payroll-table-scroll">
        <table className="payroll-readiness-table payroll-setup-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Type</th>
              <th>Value</th>
              <th>Rule reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.pageItems.map((line) => (
              <tr key={line.id}>
                <td>
                  <strong>{line.component_name}</strong>
                  <span>{line.component_code}</span>
                </td>
                <td>{titleCase(line.component_type)}</td>
                <td>{line.amount ? formatMoney(line.amount) : line.percentage ? `${line.percentage}%` : titleCase(line.value_type)}</td>
                <td>{line.formula_ref || line.calculation_rule_ref || "Configured at component"}</td>
                <td><StatusBadge status={line.is_active ? "active" : "inactive"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!lines.length ? <EmptyState title="No component lines in this view" detail="Add lines after a salary structure version exists." /> : null}
      <PaginationControls
        currentParams={currentParams}
        page={pageData.currentPage}
        pageParam="linePage"
        pageSize={pageSize}
        sizeParam="lineSize"
        tab="structures"
        total={lines.length}
        totalPages={pageData.totalPages}
      />
    </section>
  );
}

function AssignmentTable({
  assignments,
  currentParams,
}: {
  assignments: HrAdminEmployeeSalaryAssignment[];
  currentParams: Record<string, SearchParamValue>;
}) {
  const pageSize = normalizePageSize(currentParams.assignmentSize);
  const pageData = paginate(assignments, parsePositiveInteger(currentParams.assignmentPage, 1), pageSize);
  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Assignments</span>
          <h2>Employee salary coverage</h2>
          <p>Review which employees have effective salary versions and CTC override context.</p>
        </div>
        <Link className="button button--secondary" href={`${salaryHref(currentParams, { tab: "actions" })}#salary-assignment-form`}>
          New assignment
        </Link>
      </div>
      <div className="payroll-table-scroll">
        <table className="payroll-readiness-table payroll-setup-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Structure</th>
              <th>Effective</th>
              <th>Annual CTC</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {pageData.pageItems.map((assignment) => (
              <tr key={assignment.id}>
                <td>
                  <strong>{assignment.employee_name}</strong>
                  <span>{assignment.employee_code}</span>
                </td>
                <td>{assignment.structure_name} v{assignment.structure_version}</td>
                <td>{formatDate(assignment.effective_from)} - {formatDate(assignment.effective_to)}</td>
                <td>{formatMoney(assignment.annual_ctc_override || assignment.annual_ctc)}</td>
                <td><StatusBadge status={assignment.status} /></td>
                <td>{assignment.assignment_reason || "Not captured"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!assignments.length ? <EmptyState title="No salary assignments yet" detail="Assign employees to salary versions before payroll inputs are locked." /> : null}
      <PaginationControls
        currentParams={currentParams}
        page={pageData.currentPage}
        pageParam="assignmentPage"
        pageSize={pageSize}
        sizeParam="assignmentSize"
        tab="assignments"
        total={assignments.length}
        totalPages={pageData.totalPages}
      />
    </section>
  );
}

export default async function HrAdminSalarySetupPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const activeTab = normalizeTab(currentParams.tab);
  const selectedStructureId = normalizeParam(currentParams.structureId);
  const result = await getHrAdminSalarySetup();
  const setup = result.data;
  const selectedStructure = setup.structures.find((item) => item.id === selectedStructureId) ?? setup.structures[0] ?? null;
  const selectedVersions = selectedStructure ? setup.versions.filter((version) => version.structure_id === selectedStructure.id) : setup.versions;
  const selectedVersionIds = new Set(selectedVersions.map((version) => version.id));
  const selectedLines = setup.structure_components.filter((line) => selectedVersionIds.has(line.structure_version_id));

  return (
    <main className="shell shell--payroll-setup shell--salary-setup">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 1B" : "Demo payroll phase 1B"}
        title="Salary Setup"
        description="Configurable salary components, structure versions, component lines, and employee assignment coverage."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-setup">
              Payroll Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-readiness">
              Readiness
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-rules">
              Rules
            </Link>
            <Link className="button button--secondary" href={`${salaryHref(currentParams, { tab: "actions" })}#salary-component-form`}>
              Add setup
            </Link>
          </>
        }
        pills={["Versioned", "Formula references", "Effective dated"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Components" value={setup.summary.component_count} trend={`${setup.summary.active_component_count} active`} />
          <MetricTile className="metric-tile-soft" label="Structures" value={setup.summary.structure_count} trend={`${setup.summary.active_structure_count} active`} />
          <MetricTile className="metric-tile-soft" label="Active versions" value={setup.summary.active_version_count} trend="Effective dated" />
          <MetricTile className="metric-tile-soft" label="Assigned employees" value={setup.summary.assigned_employee_count} trend="Salary coverage" />
        </div>
      </section>

      <section className="section section--tight">
        <SalarySetupTabs activeTab={activeTab} currentParams={currentParams} />
      </section>

      {activeTab === "overview" ? (
        <section className="section section--tight">
          <div className="payroll-setup-overview-grid">
            <div className="payroll-setup-main-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Salary status</span>
                  <h2>Salary setup summary</h2>
                  <p>Start here for salary coverage. Use tabs to inspect components, structures, and assignments without opening every form.</p>
                </div>
                <Link className="button button--secondary" href={salaryHref(currentParams, { tab: "actions" })}>
                  Open setup actions
                </Link>
              </div>
              <div className="payroll-setup-summary-grid">
                <div className="payroll-setup-summary-card">
                  <span>Component catalog</span>
                  <strong>{setup.summary.active_component_count} active</strong>
                  <p>{setup.summary.component_count} total components.</p>
                </div>
                <div className="payroll-setup-summary-card">
                  <span>Structure versions</span>
                  <strong>{setup.summary.active_version_count} active</strong>
                  <p>{setup.summary.structure_count} structures across salary plans.</p>
                </div>
                <div className="payroll-setup-summary-card">
                  <span>Employee coverage</span>
                  <strong>{setup.summary.assigned_employee_count} assigned</strong>
                  <p>Effective salary assignment coverage for payroll inputs.</p>
                </div>
              </div>
              <div className="payroll-setup-action-strip">
                <Link className="button button--secondary" href={salaryHref(currentParams, { tab: "components" })}>
                  Review components
                </Link>
                <Link className="button button--secondary" href={salaryHref(currentParams, { tab: "structures" })}>
                  Review structures
                </Link>
                <Link className="button button--primary" href={salaryHref(currentParams, { tab: "assignments" })}>
                  Review assignments
                </Link>
              </div>
            </div>
            <StructureDetail structure={selectedStructure} />
          </div>
        </section>
      ) : null}

      {activeTab === "components" ? (
        <section className="section section--tight">
          <ComponentTable components={setup.components} currentParams={currentParams} />
        </section>
      ) : null}

      {activeTab === "structures" ? (
        <section className="section section--tight">
          <div className="payroll-setup-workspace salary-setup-workspace">
            <ComponentRail components={setup.components} currentParams={currentParams} />
            <div className="salary-setup-review-stack">
              <StructureTable currentParams={currentParams} selectedStructure={selectedStructure} structures={setup.structures} />
              <VersionTable currentParams={currentParams} versions={selectedVersions} />
              <LineTable currentParams={currentParams} lines={selectedLines} />
            </div>
            <StructureDetail structure={selectedStructure} />
          </div>
        </section>
      ) : null}

      {activeTab === "assignments" ? (
        <section className="section section--tight">
          <AssignmentTable assignments={setup.assignments} currentParams={currentParams} />
        </section>
      ) : null}

      {activeTab === "actions" ? (
        <section className="section section--tight">
          <SalarySetupCrudConsole initialSetup={setup} />
        </section>
      ) : null}
    </main>
  );
}
