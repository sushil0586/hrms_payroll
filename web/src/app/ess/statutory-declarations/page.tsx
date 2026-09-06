import type { ReactNode } from "react";
import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getEssStatutoryDeclarations } from "@/lib/api";
import type { EssStatutoryDeclaration, EssStatutoryDeclarationItem, HrAdminEmployeeStatutoryProfile } from "@/lib/types";

import { StatutoryDeclarationActions } from "./statutory-declaration-actions";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
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
  filters,
}: {
  declarations: EssStatutoryDeclaration[];
  selectedDeclaration: EssStatutoryDeclaration | null;
  filters: { q: string; status: string; financial_year: string; page_size: number };
}) {
  return (
    <aside className="payroll-setup-rail payroll-statutory-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">My declarations</span>
        <h2>Tax years</h2>
      </div>
      <div className="payroll-setup-card-list">
        {declarations.map((declaration) => (
          <Link
            className={`payroll-setup-mini-card payroll-statutory-declaration-card ${selectedDeclaration?.id === declaration.id ? "is-selected" : ""}`}
            href={`/ess/statutory-declarations${buildQueryString({
              q: filters.q,
              status: filters.status,
              financial_year: filters.financial_year,
              page_size: filters.page_size,
              declarationId: declaration.id,
            })}`}
            key={declaration.id}
          >
            <div>
              <strong>{declaration.financial_year_code}</strong>
              <span>{declaration.tax_regime_label}</span>
            </div>
            <StatusBadge status={declaration.status} label={declaration.status_label} />
            <div className="payroll-input-run-card__counts">
              <span>{formatMoney(declaration.declared_total_amount)}</span>
              <span>{declaration.verified_item_count}/{declaration.item_count} proofs</span>
            </div>
            <code>{declaration.proof_window_ref || declaration.source_hash.slice(0, 18)}</code>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function ProfilePanel({ profile }: { profile: HrAdminEmployeeStatutoryProfile | null }) {
  return (
    <section className="payroll-rule-source-card payroll-statutory-profile-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Tax profile</span>
          <h2>{profile?.employee_name || "Employee statutory profile"}</h2>
        </div>
        <StatusBadge status={profile?.declaration_status || "draft"} label={profile?.declaration_status_label || "Draft"} />
      </div>
      <div className="detail-grid">
        <DetailRow label="PAN" value={profile?.pan_number || "Pending"} />
        <DetailRow label="Tax regime" value={profile?.tax_regime_label || "Pending"} />
        <DetailRow label="PF" value={profile?.pf_applicable ? profile.uan_number || "Applicable" : "Not applicable"} />
        <DetailRow label="Professional tax" value={profile?.professional_tax_state || "Pending"} />
        <DetailRow label="Previous income" value={formatMoney(profile?.previous_employment_income)} />
        <DetailRow label="Effective from" value={formatDate(profile?.effective_from ?? null)} />
      </div>
    </section>
  );
}

function ProofItemCard({ item }: { item: EssStatutoryDeclarationItem }) {
  return (
    <article className="payroll-statutory-proof-card">
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
      <code>{item.proof_document_ref || item.source_hash.slice(0, 18)}</code>
    </article>
  );
}

function DeclarationDetail({ declaration }: { declaration: EssStatutoryDeclaration | null }) {
  if (!declaration) {
    return (
      <aside className="payroll-setup-detail-panel payroll-statutory-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Declaration detail</span>
          <h2>No declaration selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Your statutory declarations will appear here once a tax year opens.</p>
      </aside>
    );
  }

  return (
    <aside className="payroll-setup-detail-panel payroll-statutory-detail-panel" aria-label={`${declaration.financial_year_code} statutory declaration`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Declaration detail</span>
          <h2>{declaration.financial_year_code}</h2>
          <p className="section-copy section-copy-soft">{declaration.declaration_profile_ref}</p>
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
        <span className="workspace-card__eyebrow">Submission state</span>
        <div className="detail-grid">
          <DetailRow label="Tax regime" value={declaration.tax_regime_label} />
          <DetailRow label="Proof window" value={declaration.proof_window_ref || "Pending"} />
          <DetailRow label="Submitted" value={formatDate(declaration.submitted_at)} />
          <DetailRow label="Verified" value={formatDate(declaration.verified_at)} />
          <DetailRow label="Locked" value={formatDate(declaration.locked_at)} />
          <DetailRow label="Source" value={<code>{declaration.source_hash.slice(0, 24)}</code>} />
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Proof documents</span>
        <div className="payroll-statutory-proof-list">
          {declaration.items.map((item) => <ProofItemCard item={item} key={item.id} />)}
        </div>
      </section>

      <section className="payroll-rule-source-card">
        <span className="workspace-card__eyebrow">Payroll consumption</span>
        <div className="detail-grid">
          {Object.entries(declaration.config_snapshot).slice(0, 5).map(([key, value]) => (
            <DetailRow label={titleCase(key)} value={String(value ?? "Pending")} key={key} />
          ))}
        </div>
      </section>
    </aside>
  );
}

export default async function EssStatutoryDeclarationsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "";
  const financialYear = normalizeParam(currentParams.financial_year) ?? "";
  const page = Number(normalizeParam(currentParams.page) ?? 1);
  const pageSize = Number(normalizeParam(currentParams.page_size) ?? 10);
  const selectedDeclarationId = normalizeParam(currentParams.declarationId);
  const result = await getEssStatutoryDeclarations({
    q,
    status,
    financial_year: financialYear,
    page,
    page_size: pageSize,
  });
  const data = result.data;
  const selectedDeclaration = data.items.find((item) => item.id === selectedDeclarationId) ?? data.items[0] ?? null;

  return (
    <main className="shell shell--payroll-setup shell--payroll-statutory shell--ess-statutory">
      <PageIntro
        eyebrow={result.state === "live" ? "Live employee payroll phase 5E" : "Demo employee payroll phase 5E"}
        title="Statutory Declarations"
        description="Track your tax regime, investment declarations, proof verification, and payroll-ready statutory source trail."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/ess/payslips">
              Payslips
            </Link>
            <Link className="button button--secondary" href="/ess/documents">
              Documents
            </Link>
            <Link className="button button--primary" href="/ess">
              Overview
            </Link>
          </>
        }
      />

      <section className="payroll-setup-metrics" aria-label="Statutory declaration metrics">
        <MetricTile label="Declarations" value={data.summary.declaration_count} />
        <MetricTile label="Locked" value={data.summary.locked_declaration_count} />
        <MetricTile label="Proofs" value={data.summary.declaration_item_count} />
        <MetricTile label="Verified" value={data.summary.verified_item_count} />
        <MetricTile label="Declared" value={formatMoney(data.summary.declared_total_amount)} />
        <MetricTile label="Accepted" value={formatMoney(data.summary.verified_total_amount)} />
      </section>

      <section className="payroll-setup-workspace payroll-statutory-workspace">
        <DeclarationRail
          declarations={data.items}
          selectedDeclaration={selectedDeclaration}
          filters={{ q, status, financial_year: financialYear, page_size: pageSize }}
        />

        <section className="payroll-setup-main-panel payroll-statutory-main-panel">
          <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
            <div>
              <span className="workspace-card__eyebrow">Declaration workspace</span>
              <h2>Proof status and tax profile</h2>
            </div>
            <span className="payroll-setup-count">{data.total_count} tax years</span>
          </div>

          <ProfilePanel profile={data.profile} />

          <StatutoryDeclarationActions data={data} selectedDeclaration={selectedDeclaration} />

          <section className="payroll-statutory-component-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Proof register</span>
                <h2>Declared items</h2>
              </div>
              <span className="payroll-setup-count">{selectedDeclaration?.items.length ?? 0} rows</span>
            </div>
            <div className="payroll-statutory-proof-list payroll-statutory-proof-list--wide">
              {selectedDeclaration?.items.map((item) => <ProofItemCard item={item} key={item.id} />) ?? (
                <p className="section-copy section-copy-soft">No declaration items are available for the selected year.</p>
              )}
            </div>
          </section>
        </section>

        <DeclarationDetail declaration={selectedDeclaration} />
      </section>
    </main>
  );
}
