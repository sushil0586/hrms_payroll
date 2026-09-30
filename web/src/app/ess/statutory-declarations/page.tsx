import type { ReactNode } from "react";
import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { PaginationBar } from "@/components/patterns/pagination-bar";
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
    <aside className="ess-statutory-rail">
      <div className="ess-statutory-panel-header">
        <span className="workspace-card__eyebrow">My declarations</span>
        <h2>Tax years</h2>
      </div>
      <div className="ess-statutory-card-list">
        {declarations.map((declaration) => (
          <Link
            className={`ess-statutory-year-card ${selectedDeclaration?.id === declaration.id ? "is-selected" : ""}`}
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
            <div className="ess-statutory-year-card__meta">
              <span>{formatMoney(declaration.declared_total_amount)}</span>
              <span>{declaration.verified_item_count}/{declaration.item_count} proofs</span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function ProfilePanel({ profile }: { profile: HrAdminEmployeeStatutoryProfile | null }) {
  return (
    <section className="ess-statutory-section ess-statutory-profile-panel">
      <div className="ess-statutory-panel-header ess-statutory-panel-header--split">
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
    <article className="ess-statutory-proof-card">
      <div>
        <strong>{item.name}</strong>
        <span>
          {item.section_code} / {item.component_code || item.item_kind_label}
        </span>
      </div>
      <StatusBadge status={item.proof_status} label={item.proof_status_label} />
      <div className="ess-statutory-proof-amounts">
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
      <aside className="ess-statutory-detail">
        <div className="ess-statutory-panel-header">
          <span className="workspace-card__eyebrow">Declaration detail</span>
          <h2>No declaration selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Your statutory declarations will appear here once a tax year opens.</p>
      </aside>
    );
  }

  return (
    <aside className="ess-statutory-detail" aria-label={`${declaration.financial_year_code} statutory declaration`}>
      <div className="ess-statutory-panel-header ess-statutory-panel-header--split">
        <div>
          <span className="workspace-card__eyebrow">Declaration detail</span>
          <h2>{declaration.financial_year_code}</h2>
          <p className="section-copy section-copy-soft">{declaration.tax_regime_label}</p>
        </div>
        <StatusBadge status={declaration.status} label={declaration.status_label} />
      </div>

      <div className="ess-statutory-total-strip">
        <div>
          <span className="workspace-card__eyebrow">Declared</span>
          <strong>{formatMoney(declaration.declared_total_amount)}</strong>
        </div>
        <div>
          <span className="workspace-card__eyebrow">Verified</span>
          <strong>{formatMoney(declaration.verified_total_amount)}</strong>
        </div>
      </div>

      <section className="ess-statutory-section">
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

      <section className="ess-statutory-section">
        <span className="workspace-card__eyebrow">Proof documents</span>
        <div className="ess-statutory-proof-list">
          {declaration.items.map((item) => <ProofItemCard item={item} key={item.id} />)}
        </div>
      </section>

      <section className="ess-statutory-section">
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
  const totalPages = Math.max(1, Math.ceil(data.total_count / Math.max(data.page_size, 1)));
  const sharedParams = { q, status, financial_year: financialYear, page_size: data.page_size, declarationId: selectedDeclaration?.id };

  return (
    <main className="shell shell--workspace shell--ess-statutory">
      <PageIntro
        eyebrow={result.state === "live" ? "Live employee tax" : "Demo employee tax"}
        title="Statutory Declarations"
        description="Choose your tax regime, declare investments, upload proof, and track what HR has verified for payroll."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/ess">
              Overview
            </Link>
            <Link className="button button--secondary" href="/ess/documents">
              Documents
            </Link>
            <Link className="button button--secondary" href="/ess/payslips">
              Payslips
            </Link>
          </>
        }
        pills={["Personal tax", "Proof tracked", "Payroll ready"]}
        showPills
      />

      <section className="section section--tight" aria-label="Statutory declaration metrics">
        <div className="metric-grid-modern">
          <MetricTile className="metric-tile-soft" label="Declarations" value={data.summary.declaration_count} trend="Tax years in view" />
          <MetricTile className="metric-tile-soft" label="Locked" value={data.summary.locked_declaration_count} trend="No longer editable" />
          <MetricTile className="metric-tile-soft" label="Proofs" value={data.summary.declaration_item_count} trend="Declared proof rows" />
          <MetricTile className="metric-tile-soft" label="Verified" value={data.summary.verified_item_count} trend="Accepted by HR" />
          <MetricTile className="metric-tile-soft" label="Declared" value={formatMoney(data.summary.declared_total_amount)} trend="Employee total" />
          <MetricTile className="metric-tile-soft" label="Accepted" value={formatMoney(data.summary.verified_total_amount)} trend="Payroll accepted" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="ess-statutory-workspace">
        <DeclarationRail
          declarations={data.items}
          selectedDeclaration={selectedDeclaration}
          filters={{ q, status, financial_year: financialYear, page_size: pageSize }}
        />

        <section className="ess-statutory-main">
          <div className="ess-statutory-panel-header ess-statutory-panel-header--split">
            <div>
              <span className="workspace-card__eyebrow">Declaration workspace</span>
              <h2>Tax profile and proofs</h2>
            </div>
            <span className="payroll-setup-count">{data.total_count} tax years</span>
          </div>

          <form action="/ess/statutory-declarations" className="ess-statutory-filter-form">
            <input aria-label="Search declarations" className="input-control" defaultValue={q} name="q" placeholder="Search year, regime, proof" />
            <select aria-label="Status" className="input-control" defaultValue={status} name="status">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="locked">Locked</option>
            </select>
            <select aria-label="Financial year" className="input-control" defaultValue={financialYear} name="financial_year">
              <option value="">All years</option>
              {data.summary.available_financial_years.map((yearOption) => (
                <option key={yearOption} value={yearOption}>{yearOption}</option>
              ))}
            </select>
            <select aria-label="Rows per page" className="input-control" defaultValue={String(pageSize)} name="page_size">
              <option value="5">5 / page</option>
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
            </select>
            <button className="button button--primary" type="submit">Apply</button>
          </form>

          <ProfilePanel profile={data.profile} />

          <StatutoryDeclarationActions data={data} selectedDeclaration={selectedDeclaration} />

          <section className="ess-statutory-section ess-statutory-proof-register">
            <div className="ess-statutory-panel-header ess-statutory-panel-header--split">
              <div>
                <span className="workspace-card__eyebrow">Proof register</span>
                <h2>Declared items</h2>
              </div>
              <span className="payroll-setup-count">{selectedDeclaration?.items.length ?? 0} rows</span>
            </div>
            <div className="ess-statutory-proof-list ess-statutory-proof-list--wide">
              {selectedDeclaration?.items.map((item) => <ProofItemCard item={item} key={item.id} />) ?? (
                <p className="section-copy section-copy-soft">No declaration items are available for the selected year.</p>
              )}
            </div>
          </section>

          {data.total_count > data.page_size ? (
            <PaginationBar
              firstHref={`/ess/statutory-declarations${buildQueryString({ ...sharedParams, page: 1 })}`}
              hasNext={Boolean(data.has_next)}
              hasPrevious={Boolean(data.has_previous)}
              lastHref={`/ess/statutory-declarations${buildQueryString({ ...sharedParams, page: totalPages })}`}
              nextHref={`/ess/statutory-declarations${buildQueryString({ ...sharedParams, page: data.page + 1 })}`}
              page={data.page}
              pageSize={data.page_size}
              previousHref={`/ess/statutory-declarations${buildQueryString({ ...sharedParams, page: data.page - 1 })}`}
              totalCount={data.total_count}
            />
          ) : null}
        </section>

        <DeclarationDetail declaration={selectedDeclaration} />
        </div>
      </section>
    </main>
  );
}
