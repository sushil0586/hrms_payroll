import type { ReactNode } from "react";
import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollStatutorySetup } from "@/lib/api";
import type {
  HrAdminEmployeeStatutoryDeclaration,
  HrAdminEmployeeStatutoryDeclarationItem,
  HrAdminEmployeeStatutoryProfile,
  HrAdminPayrollStatutoryComponent,
  HrAdminPayrollStatutoryEmployerRegistration,
  HrAdminPayrollStatutoryFilingCalendar,
  HrAdminPayrollStatutoryPack,
} from "@/lib/types";

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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function DeclarationRail({
  declarations,
  selectedDeclaration,
}: {
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
            href={`/hr-admin/payroll-statutory?declarationId=${declaration.id}`}
            key={declaration.id}
          >
            <div>
              <strong>{declaration.employee_name}</strong>
              <span>
                {declaration.employee_code} / {declaration.financial_year_code}
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
      </div>
    </aside>
  );
}

function DeclarationDetail({
  declaration,
  profile,
  proofItems,
}: {
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
          <h2>{declaration.employee_name}</h2>
          <p className="section-copy section-copy-soft">
            {declaration.employee_code} / {declaration.financial_year_code} / {declaration.tax_regime_label}
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
      </div>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Profile controls</span>
        <div className="detail-grid">
          <DetailRow label="Pack" value={declaration.statutory_pack_name || "Unassigned"} />
          <DetailRow label="Profile" value={profile?.profile_ref || declaration.declaration_profile_ref} />
          <DetailRow label="PAN" value={profile?.pan_number || "Pending"} />
          <DetailRow label="PF" value={profile?.pf_applicable ? profile.uan_number || "Applicable" : "Not applicable"} />
          <DetailRow label="PT state" value={profile?.professional_tax_state || "Pending"} />
          <DetailRow label="Proof window" value={declaration.proof_window_ref || "Pending"} />
        </div>
      </section>

      <section className="payroll-rule-source-card">
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
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Lifecycle</span>
        <div className="detail-grid">
          <DetailRow label="Submitted" value={formatDate(declaration.submitted_at)} />
          <DetailRow label="Verified" value={formatDate(declaration.verified_at)} />
          <DetailRow label="Locked" value={formatDate(declaration.locked_at)} />
          <DetailRow label="Source" value={<code>{declaration.source_hash}</code>} />
        </div>
      </section>
    </aside>
  );
}

function ComponentRegister({ components }: { components: HrAdminPayrollStatutoryComponent[] }) {
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
        {components.map((component) => (
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
      </div>
    </section>
  );
}

function EmployerRegistrationPanel({
  registrations,
}: {
  registrations: HrAdminPayrollStatutoryEmployerRegistration[];
}) {
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
        {registrations.map((registration) => (
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
      </div>
    </section>
  );
}

function FilingCalendarPanel({
  filingCalendars,
}: {
  filingCalendars: HrAdminPayrollStatutoryFilingCalendar[];
}) {
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
        {filingCalendars.map((filing) => (
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

export default async function HrAdminPayrollStatutoryPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const selectedDeclarationId = normalizeParam(currentParams.declarationId);
  const result = await getHrAdminPayrollStatutorySetup();
  const setup = result.data;
  const selectedDeclaration =
    setup.declarations.find((item) => item.id === selectedDeclarationId) ??
    setup.declarations[0] ??
    null;
  const selectedProfile = selectedDeclaration
    ? setup.employee_profiles.find((item) => item.id === selectedDeclaration.employee_statutory_profile_id) ?? null
    : null;
  const selectedProofItems = selectedDeclaration
    ? setup.declaration_items.filter((item) => item.declaration_id === selectedDeclaration.id)
    : [];
  const activePack = setup.packs.find((item) => item.status === "active") ?? setup.packs[0] ?? null;

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 5I" : "Demo payroll phase 5I"}
        title="Payroll Statutory"
        description="Review statutory packs, employee tax profiles, declaration proofs, and source-controlled verification state before payroll calculation consumes them."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-handoff">
              Handoff
            </Link>
            <Link className="button button--primary" href="/hr-admin/payroll-rules">
              Rule catalog
            </Link>
          </>
        }
      />

      <section className="payroll-setup-metrics" aria-label="Payroll statutory metrics">
        <MetricTile label="Active Packs" value={setup.summary.active_pack_count} />
        <MetricTile label="Components" value={setup.summary.active_statutory_component_count} />
        <MetricTile label="Profiles" value={setup.summary.active_employee_profile_count} />
        <MetricTile label="Registrations" value={setup.summary.active_employer_registration_count} />
        <MetricTile label="Due Filings" value={setup.summary.due_filing_calendar_count} />
        <MetricTile label="Declarations" value={setup.summary.declaration_count} />
        <MetricTile label="Locked" value={setup.summary.locked_declaration_count} />
        <MetricTile label="Proofs Verified" value={setup.summary.verified_declaration_item_count} />
      </section>

      <section className="payroll-setup-workspace payroll-statutory-workspace">
        <DeclarationRail declarations={setup.declarations} selectedDeclaration={selectedDeclaration} />

        <section className="payroll-setup-main-panel payroll-statutory-main-panel">
          <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
            <div>
              <span className="workspace-card__eyebrow">Review register</span>
              <h2>Declarations and proof evidence</h2>
            </div>
            <span className="payroll-setup-count">{setup.summary.declaration_item_count} proof rows</span>
          </div>

          <PackSummary pack={activePack} />
          <EmployerRegistrationPanel registrations={setup.employer_registrations} />
          <FilingCalendarPanel filingCalendars={setup.filing_calendars} />

          <div className="payroll-table-scroll payroll-table-scroll--compact payroll-statutory-table-shell">
            <table className="payroll-readiness-table payroll-statutory-table">
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
                {setup.declarations.map((declaration) => (
                  <tr key={declaration.id}>
                    <td>
                      <Link href={`/hr-admin/payroll-statutory?declarationId=${declaration.id}`}>{declaration.employee_name}</Link>
                      <span className="table-cell-subtitle">{declaration.employee_code}</span>
                    </td>
                    <td>{declaration.financial_year_code}</td>
                    <td><StatusBadge status={declaration.status} label={declaration.status_label} /></td>
                    <td>{declaration.tax_regime_label}</td>
                    <td>{formatMoney(declaration.declared_total_amount)}</td>
                    <td>{formatMoney(declaration.verified_total_amount)}</td>
                    <td>{declaration.verified_item_count}/{declaration.item_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ComponentRegister components={setup.statutory_components} />
        </section>

        <DeclarationDetail declaration={selectedDeclaration} profile={selectedProfile} proofItems={selectedProofItems} />
      </section>
    </main>
  );
}
