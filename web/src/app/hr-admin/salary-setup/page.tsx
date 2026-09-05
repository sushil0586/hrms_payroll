import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminSalarySetup } from "@/lib/api";
import type { HrAdminSalaryComponent, HrAdminSalaryStructure } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
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

function ComponentRail({ components }: { components: HrAdminSalaryComponent[] }) {
  return (
    <div className="payroll-setup-rail salary-setup-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Components</span>
        <h2>Catalog</h2>
      </div>
      <div className="salary-component-stack">
        {components.map((component) => (
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
            {component.formula_ref ? <code>{component.formula_ref}</code> : null}
          </article>
        ))}
      </div>
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

export default async function HrAdminSalarySetupPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const selectedStructureId = normalizeParam(currentParams.structureId);
  const result = await getHrAdminSalarySetup();
  const setup = result.data;
  const selectedStructure = setup.structures.find((item) => item.id === selectedStructureId) ?? setup.structures[0] ?? null;
  const selectedVersions = selectedStructure ? setup.versions.filter((version) => version.structure_id === selectedStructure.id) : setup.versions;
  const selectedVersionIds = new Set(selectedVersions.map((version) => version.id));
  const selectedLines = setup.structure_components.filter((line) => selectedVersionIds.has(line.structure_version_id));
  const selectedAssignments = setup.assignments.filter((assignment) => selectedVersionIds.has(assignment.structure_version_id));

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
            <Link className="button button--secondary" href="/hr-admin/payroll-inputs">
              Inputs
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-rules">
              Rules
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
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
        <div className="payroll-setup-workspace salary-setup-workspace">
          <ComponentRail components={setup.components} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Salary structures</span>
                <h2>Version matrix</h2>
              </div>
              <span className="payroll-setup-count">{setup.structures.length} structures</span>
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
                  {setup.structures.map((structure) => (
                    <tr className={selectedStructure?.id === structure.id ? "is-selected" : ""} key={structure.id}>
                      <td>
                        <Link href={`/hr-admin/salary-setup?structureId=${structure.id}`}>
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

            <div className="payroll-setup-period-strip">
              <div className="payroll-setup-panel__header">
                <span className="workspace-card__eyebrow">Versions</span>
                <h2>{selectedStructure ? selectedStructure.name : "All structures"}</h2>
              </div>
              <div className="salary-version-grid">
                {selectedVersions.map((version) => (
                  <article className="payroll-setup-period salary-version-card" key={version.id}>
                    <div>
                      <strong>Version {version.version}</strong>
                      <span>{formatDate(version.effective_from)} - {formatDate(version.effective_to)}</span>
                    </div>
                    <StatusBadge status={version.status} />
                    <span>{formatMoney(version.annual_ctc)} annual CTC</span>
                    <span>{version.component_count} components / {version.assignment_count} assignments</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header">
                <span className="workspace-card__eyebrow">Component lines</span>
                <h2>Structure composition</h2>
              </div>
              <div className="payroll-table-scroll payroll-table-scroll--compact">
                <table className="payroll-readiness-table payroll-setup-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Rule reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <strong>{line.component_name}</strong>
                          <span>{line.component_code}</span>
                        </td>
                        <td>{titleCase(line.component_type)}</td>
                        <td>{line.amount ? formatMoney(line.amount) : line.percentage ? `${line.percentage}%` : titleCase(line.value_type)}</td>
                        <td>{line.formula_ref || line.calculation_rule_ref || "Configured at component"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="payroll-setup-assignment-panel salary-assignment-panel">
              <div className="payroll-setup-panel__header">
                <span className="workspace-card__eyebrow">Assignments</span>
                <h2>Employee salary coverage</h2>
              </div>
              <div className="payroll-table-scroll payroll-table-scroll--compact">
                <table className="payroll-readiness-table payroll-setup-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Effective</th>
                      <th>Annual CTC</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          <strong>{assignment.employee_name}</strong>
                          <span>{assignment.employee_code}</span>
                        </td>
                        <td>{formatDate(assignment.effective_from)} - {formatDate(assignment.effective_to)}</td>
                        <td>{formatMoney(assignment.annual_ctc)}</td>
                        <td>{assignment.assignment_reason || "Not captured"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <StructureDetail structure={selectedStructure} />
        </div>
      </section>
    </main>
  );
}
