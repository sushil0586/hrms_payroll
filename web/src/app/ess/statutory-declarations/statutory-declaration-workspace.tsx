"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { ActionToast } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceFilterBar, WorkspaceStatusBadge, WorkspaceStandardHeader, WorkspaceDataTable } from "@/components/patterns/workspace-standard";
import { type FieldErrors, hasFieldErrors, requireText, requireValue, validateUploadFile } from "@/lib/ui/validation";
import { useRefreshAfterMutation } from "@/lib/ui/use-refresh-after-mutation";
import { essDocumentDate, essMoney, maskEmployeeIdentifier } from "@/lib/ui/employee-document-format";
import type {
  EssStatutoryDeclaration,
  EssStatutoryDeclarationItem,
  EssStatutoryDeclarationListResponse,
  HrAdminEmployeeStatutoryProfile,
} from "@/lib/types";

type Props = {
  data: EssStatutoryDeclarationListResponse;
  filters: {
    financial_year: string;
    page: number;
    page_size: number;
    q: string;
    status: string;
  };
  isDemo: boolean;
  selectedDeclarationId?: string;
};

type ModalState = "declaration" | "proof" | "submit" | "proofDetail" | null;
type NoticeTone = "success" | "error" | "info";
type DeclarationField = "financial_year_code" | "tax_regime";
type ProofField = "name" | "declared_amount" | "proof_category_id" | "proof_file";

const indianTaxSections = [
  {
    code: "80C",
    title: "80C investments",
    hint: "EPF, PPF, ELSS, LIC, tuition fees, NSC, Sukanya, or housing principal.",
  },
  {
    code: "80CCD(1B)",
    title: "NPS additional",
    hint: "Additional employee NPS declaration, generally tracked separately from 80C.",
  },
  {
    code: "80D",
    title: "Medical insurance",
    hint: "Self, family, and parent medical insurance proof.",
  },
  {
    code: "HRA",
    title: "House rent allowance",
    hint: "Rent receipts, landlord details, and PAN where required.",
  },
  {
    code: "HOME_LOAN",
    title: "Home loan",
    hint: "Interest certificate, lender details, and property context.",
  },
  {
    code: "PREVIOUS_EMPLOYER",
    title: "Previous employer",
    hint: "Previous income, TDS, and Form 16 or salary statement.",
  },
];

function apiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail) {
      return detail;
    }
    return JSON.stringify(payload);
  }
  return fallback;
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

function formatDate(value: string | null | undefined) { return essDocumentDate(value ?? null); }
function formatMoney(value: unknown) { return essMoney(value); }

function isEditable(declaration: EssStatutoryDeclaration | null) {
  return declaration?.status === "draft" || declaration?.status === "rejected";
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = status === "verified" || status === "locked" ? "success" : status === "rejected" ? "danger" : status === "submitted" ? "info" : "warning";
  return <WorkspaceStatusBadge tone={tone}>{label || titleCase(status)}</WorkspaceStatusBadge>;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function TaxYearRail({
  declarations,
  filters,
  selectedDeclaration,
}: {
  declarations: EssStatutoryDeclaration[];
  filters: Props["filters"];
  selectedDeclaration: EssStatutoryDeclaration | null;
}) {
  return (
    <section className="workspace-data-panel ess-tax-rail" aria-label="Tax year selector">
      <div className="workspace-data-panel__header ess-tax-panel-header">
        <div>
          <span className="workspace-card__eyebrow">Tax years</span>
          <h2>My declarations</h2>
          <p>Choose the financial year you want to review or update.</p>
        </div>
      </div>
      <div className="ess-tax-year-list">
        {declarations.map((declaration) => (
          <Link
            prefetch={false}
            className={`ess-tax-year-card ${selectedDeclaration?.id === declaration.id ? "is-selected" : ""}`}
            href={`/ess/statutory-declarations${buildQueryString({
              declarationId: declaration.id,
              financial_year: filters.financial_year,
              page_size: filters.page_size,
              q: filters.q,
              status: filters.status,
            })}`}
            key={declaration.id}
          >
            <span>
              <strong>{declaration.financial_year_code}</strong>
              <small>{declaration.tax_regime_label}</small>
            </span>
            <StatusBadge status={declaration.status} label={declaration.status_label} />
            <span className="ess-tax-year-card__meta">
              <small>{formatMoney(declaration.declared_total_amount)} declared</small>
              <small>{declaration.verified_item_count}/{declaration.item_count} proofs accepted</small>
            </span>
          </Link>
        ))}
        {declarations.length === 0 ? (
          <div className="ess-tax-empty-card">
            <strong>No tax year opened</strong>
            <span>Start a declaration when the statutory window is available.</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProfileSummary({ profile }: { profile: HrAdminEmployeeStatutoryProfile | null }) {
  return (
    <section className="workspace-data-panel ess-tax-card ess-tax-profile-card">
      <div className="ess-tax-panel-header ess-tax-panel-header--plain">
        <div>
          <span className="workspace-card__eyebrow">Tax profile</span>
          <h2>{profile?.employee_name || "Profile pending"}</h2>
          <p className="section-copy section-copy-soft">PAN, statutory pack, and regime defaults used by payroll.</p>
        </div>
        <StatusBadge status={profile?.declaration_status || "draft"} label={profile?.declaration_status_label || "Draft"} />
      </div>
      <div className="workspace-summary-grid ess-tax-profile-grid">
        <DetailRow label="PAN" value={maskEmployeeIdentifier(profile?.pan_number)} />
        <DetailRow label="Tax regime" value={profile?.tax_regime_label || "Pending"} />
        <DetailRow label="PF / UAN" value={profile?.pf_applicable ? maskEmployeeIdentifier(profile.uan_number) : "Not applicable"} />
        <DetailRow label="Professional tax" value={profile?.professional_tax_state || "Pending"} />
        <DetailRow label="Previous income" value={formatMoney(profile?.previous_employment_income)} />
        <DetailRow label="Effective from" value={formatDate(profile?.effective_from)} />
      </div>
    </section>
  );
}

function DeclarationSnapshot({ declaration }: { declaration: EssStatutoryDeclaration | null }) {
  if (!declaration) {
    return (
      <section className="workspace-data-panel ess-tax-card ess-tax-declaration-card">
        <div className="ess-tax-panel-header ess-tax-panel-header--plain">
          <div>
            <span className="workspace-card__eyebrow">Current declaration</span>
            <h2>No declaration selected</h2>
            <p className="section-copy section-copy-soft">Start a declaration to choose your tax regime and add proofs.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-data-panel ess-tax-card ess-tax-declaration-card">
      <div className="ess-tax-panel-header ess-tax-panel-header--plain">
        <div>
          <span className="workspace-card__eyebrow">Current declaration</span>
          <h2>{declaration.financial_year_code}</h2>
          <p className="section-copy section-copy-soft">{declaration.tax_regime_label}</p>
        </div>
        <StatusBadge status={declaration.status} label={declaration.status_label} />
      </div>
      <div className="ess-tax-total-strip">
        <div>
          <span className="workspace-card__eyebrow">Declared</span>
          <strong>{formatMoney(declaration.declared_total_amount)}</strong>
        </div>
        <div>
          <span className="workspace-card__eyebrow">Accepted</span>
          <strong>{formatMoney(declaration.verified_total_amount)}</strong>
        </div>
        <div>
          <span className="workspace-card__eyebrow">Proofs</span>
          <strong>{declaration.item_count}</strong>
        </div>
        <div>
          <span className="workspace-card__eyebrow">Rejected</span>
          <strong>{declaration.rejected_item_count}</strong>
        </div>
      </div>
      <div className="workspace-summary-grid ess-tax-profile-grid">
        <DetailRow label="Submitted" value={formatDate(declaration.submitted_at)} />
        <DetailRow label="Verified" value={formatDate(declaration.verified_at)} />
        <DetailRow label="Locked" value={formatDate(declaration.locked_at)} />
        <DetailRow label="Proof window" value={declaration.proof_window_ref || "Pending"} />
      </div>
    </section>
  );
}

function SectionOverview({ declaration }: { declaration: EssStatutoryDeclaration | null }) {
  const items = declaration?.items ?? [];

  return (
    <section className="workspace-section ess-tax-card">
      <div className="ess-tax-panel-header ess-tax-panel-header--plain">
        <div>
          <span className="workspace-card__eyebrow">India declaration sections</span>
          <h2>Proof coverage</h2>
          <p className="section-copy section-copy-soft">Common India sections are shown as guidance. Tenant statutory setup still controls what payroll accepts.</p>
        </div>
      </div>
      <div className="ess-tax-section-grid">
        {indianTaxSections.map((section) => {
          const matchingItems = items.filter((item) => item.section_code.toLowerCase() === section.code.toLowerCase());
          const declared = matchingItems.reduce((sum, item) => sum + Number(item.declared_amount || 0), 0);
          return (
            <article className="ess-tax-section-card" key={section.code}>
              <div>
                <span className="workspace-card__eyebrow">{section.code}</span>
                <h3>{section.title}</h3>
                <p>{section.hint}</p>
              </div>
              <div className="ess-tax-section-card__footer">
                <span>{matchingItems.length} proofs</span>
                <strong>{formatMoney(declared)}</strong>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProofRegister({
  items,
  onOpenProof,
}: {
  items: EssStatutoryDeclarationItem[];
  onOpenProof: (item: EssStatutoryDeclarationItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const filteredItems = items.filter((item) => {
    const haystack = `${item.name} ${item.section_code} ${item.component_code} ${item.proof_status_label}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesStatus = !status || item.proof_status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <section className="workspace-data-panel ess-tax-card">
      <div className="workspace-data-panel__header ess-tax-panel-header ess-tax-panel-header--plain">
        <div>
          <span className="workspace-card__eyebrow">Proof register</span>
          <h2>Declared items</h2>
          <p className="section-copy section-copy-soft">Review proof status without editing the whole declaration.</p>
        </div>
        <span className="payroll-setup-count">{filteredItems.length} shown</span>
      </div>
      <WorkspaceFilterBar className="ess-tax-register-filter-grid">
          <label className="form-field">
            <span>Search proofs</span>
            <input className="input-control" onChange={(event) => setQuery(event.target.value)} placeholder="Section, item, status" value={query} />
          </label>
          <label className="form-field">
            <span>Proof status</span>
            <select className="input-control" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
      </WorkspaceFilterBar>
      <WorkspaceDataTable className="ess-tax-proof-list" ariaLabel="Declared proof items" scrollLabel="Declared proof items, scroll horizontally for actions">
        <thead>
          <tr>
            <th>Proof</th>
            <th>Status</th>
            <th>Declared</th>
            <th>Accepted</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.id}>
              <td className="workspace-table__primary-cell">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.section_code} / {item.component_code || item.item_kind_label}</span>
                </div>
              </td>
              <td><StatusBadge status={item.proof_status} label={item.proof_status_label} /></td>
              <td>{formatMoney(item.declared_amount)}</td>
              <td>{formatMoney(item.verified_amount)}</td>
              <td>
                <button className="button button--secondary" onClick={(event) => { event.currentTarget.focus(); onOpenProof(item); }} type="button">View details</button>
              </td>
            </tr>
          ))}
        </tbody>
      </WorkspaceDataTable>
      {filteredItems.length === 0 ? (
          <div className="ess-tax-empty-card">
            <strong>No proof rows match</strong>
            <span>Clear filters or add a proof to this declaration.</span>
          </div>
        ) : null}
    </section>
  );
}

function NextActionPanel({
  declaration,
  onAddProof,
  onStartDeclaration,
  onSubmit,
  profile,
}: {
  declaration: EssStatutoryDeclaration | null;
  onAddProof: () => void;
  onStartDeclaration: () => void;
  onSubmit: () => void;
  profile: HrAdminEmployeeStatutoryProfile | null;
}) {
  const editable = isEditable(declaration);
  const needsPan = !profile?.pan_number;
  const rejected = declaration?.rejected_item_count ?? 0;
  const nextActionTitle = !declaration
    ? "Start declaration"
    : editable
      ? "Continue declaration"
      : "Review submitted declaration";
  const nextActionCopy = !declaration
    ? "Choose a financial year and tax regime before adding proof."
    : editable
      ? "Add proof rows, correct rejected evidence, and submit when ready."
      : "Your declaration is submitted or locked. Review proof status and HR decisions.";

  return (
    <section className="workspace-data-panel ess-tax-next-panel" aria-label="Tax declaration checklist">
      <div className="ess-tax-panel-header ess-tax-panel-header--plain">
        <div>
          <span className="workspace-card__eyebrow">What to do next</span>
          <h2>{nextActionTitle}</h2>
          <p>{nextActionCopy}</p>
        </div>
      </div>
      <div className="ess-tax-next-list">
        <div className={`ess-tax-next-item ${needsPan ? "is-warning" : "is-ready"}`}>
          <strong>{needsPan ? "PAN missing" : "PAN recorded"}</strong>
          <span>{needsPan ? "Ask HR to update PAN before payroll consumes tax data." : maskEmployeeIdentifier(profile?.pan_number)}</span>
        </div>
        <div className={`ess-tax-next-item ${declaration ? "is-ready" : "is-warning"}`}>
          <strong>{declaration ? "Declaration opened" : "Start declaration"}</strong>
          <span>{declaration ? declaration.financial_year_code : "Choose financial year and tax regime."}</span>
        </div>
        <div className={`ess-tax-next-item ${rejected > 0 ? "is-warning" : "is-ready"}`}>
          <strong>{rejected > 0 ? `${rejected} proofs need correction` : "No rejected proofs"}</strong>
          <span>{rejected > 0 ? "Open proof detail and replace evidence where needed." : "HR has not rejected any selected proof."}</span>
        </div>
      </div>
      <div className="ess-tax-next-actions">
        <button className="button button--primary" onClick={(event) => { event.currentTarget.focus(); onStartDeclaration(); }} type="button">
          {editable ? "Update declaration" : declaration ? "View setup" : "Start declaration"}
        </button>
        <button className="button button--secondary" disabled={!editable} onClick={(event) => { event.currentTarget.focus(); onAddProof(); }} type="button">
          Add proof
        </button>
        <button className="button button--secondary" disabled={!editable || (declaration?.item_count ?? 0) === 0} onClick={(event) => { event.currentTarget.focus(); onSubmit(); }} type="button">
          Submit declaration
        </button>
      </div>
    </section>
  );
}

export function StatutoryDeclarationWorkspace({ data, filters, isDemo, selectedDeclarationId }: Props) {
  const { isRefreshing, refresh } = useRefreshAfterMutation();
  const selectedDeclaration = data.items.find((item) => item.id === selectedDeclarationId) ?? data.items[0] ?? null;
  const editableDeclaration = isEditable(selectedDeclaration) ? selectedDeclaration : null;
  const readOnlySetup = Boolean(selectedDeclaration && !editableDeclaration);
  const [activeModal, setActiveModal] = useState<ModalState>(null);
  const [selectedProof, setSelectedProof] = useState<EssStatutoryDeclarationItem | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("info");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);
  const [declarationFieldErrors, setDeclarationFieldErrors] = useState<FieldErrors<DeclarationField>>({});
  const [proofFieldErrors, setProofFieldErrors] = useState<FieldErrors<ProofField>>({});
  const [isSavingDeclaration, setIsSavingDeclaration] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultFinancialYear = useMemo(() => {
    const snapshotValue = data.profile?.config_snapshot?.default_declaration_financial_year;
    return typeof snapshotValue === "string" ? snapshotValue : data.summary.available_financial_years[0] ?? "";
  }, [data.profile?.config_snapshot, data.summary.available_financial_years]);
  const defaultProofWindow = useMemo(() => {
    const snapshotValue = data.profile?.config_snapshot?.default_proof_window_ref;
    return typeof snapshotValue === "string" ? snapshotValue : selectedDeclaration?.proof_window_ref ?? "";
  }, [data.profile?.config_snapshot, selectedDeclaration?.proof_window_ref]);

  const [financialYearCode, setFinancialYearCode] = useState(selectedDeclaration?.financial_year_code ?? defaultFinancialYear);
  const [taxRegime, setTaxRegime] = useState(selectedDeclaration?.tax_regime ?? data.profile?.tax_regime ?? "not_declared");
  const [declarationProfileRef, setDeclarationProfileRef] = useState(selectedDeclaration?.declaration_profile_ref ?? "");
  const [proofWindowRef, setProofWindowRef] = useState(selectedDeclaration?.proof_window_ref ?? defaultProofWindow);
  const [sectionCode, setSectionCode] = useState("80C");
  const [componentCode, setComponentCode] = useState("");
  const [itemKind, setItemKind] = useState(data.options.statutory_declaration_item_kinds[0]?.value ?? "investment");
  const [itemName, setItemName] = useState("");
  const [declaredAmount, setDeclaredAmount] = useState("");
  const [proofDocumentRef, setProofDocumentRef] = useState("");
  const [proofCategoryId, setProofCategoryId] = useState(data.options.proof_upload_categories[0]?.id ?? "");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFileInputKey, setProofFileInputKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(data.total_count / Math.max(data.page_size, 1)));
  const sharedParams = {
    declarationId: selectedDeclaration?.id,
    financial_year: filters.financial_year,
    page_size: data.page_size,
    q: filters.q,
    status: filters.status,
  };

  function openProofDetail(item: EssStatutoryDeclarationItem) {
    setSelectedProof(item);
    setActiveModal("proofDetail");
  }

  function setNoticeMessage(message: string, tone: NoticeTone = "info") {
    setNotice(message);
    setNoticeTone(tone);
    if (tone === "success" || tone === "error") {
      setToast({ title: tone === "success" ? "Action saved." : "Action failed.", message, tone });
    }
  }

  function clearDeclarationFieldError(field: DeclarationField) {
    setDeclarationFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function clearProofFieldError(field: ProofField) {
    setProofFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleDeclarationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnlySetup) return;
    setDeclarationFieldErrors({});
    const nextErrors: FieldErrors<DeclarationField> = {
      financial_year_code: requireText(financialYearCode, "Enter the financial year for this declaration."),
      tax_regime: requireValue(taxRegime, "Select the tax regime for this declaration."),
    };
    if (hasFieldErrors(nextErrors)) {
      setDeclarationFieldErrors(nextErrors);
      setNoticeMessage("Review the highlighted declaration fields and try again.", "error");
      return;
    }
    setIsSavingDeclaration(true);
    setNoticeMessage("");
    const payload: Record<string, unknown> = {
      employee_statutory_profile_id: data.profile?.id,
      financial_year_code: financialYearCode,
      tax_regime: taxRegime,
      config_snapshot: {
        entry_surface_ref: "ess.statutory-declarations",
      },
    };
    if (declarationProfileRef.trim()) {
      payload.declaration_profile_ref = declarationProfileRef.trim();
    }
    if (proofWindowRef.trim()) {
      payload.proof_window_ref = proofWindowRef.trim();
    }
    const endpoint = editableDeclaration ? `/api/me/statutory-declarations/${editableDeclaration.id}` : "/api/me/statutory-declarations";
    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: editableDeclaration ? "PATCH" : "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNoticeMessage(apiErrorMessage(result, "Declaration could not be saved."), "error");
        return;
      }
      setNoticeMessage("Declaration saved.", "success");
      setActiveModal(null);
      refresh();
    } catch {
      setNoticeMessage("Unable to reach the server. Check your connection and try again.", "error");
    } finally {
      setIsSavingDeclaration(false);
    }
  }

  async function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProofFieldErrors({});
    if (!editableDeclaration) {
      setNoticeMessage("Select a draft or rejected declaration first.", "error");
      return;
    }
    const amount = Number(declaredAmount);
    const nextErrors: FieldErrors<ProofField> = {
      name: requireText(itemName, "Enter a clear proof item name."),
      declared_amount: requireText(declaredAmount, "Enter the declared amount for this proof item.") ?? (!Number.isFinite(amount) || amount <= 0 ? "Enter a declared amount greater than zero." : undefined),
      proof_category_id: proofFile ? requireValue(proofCategoryId, "Select the upload category before attaching proof.") : undefined,
      proof_file: validateUploadFile(proofFile, {
        blockedTypeMessage: "This proof file type is not allowed. Upload a PDF, image, or document file.",
      }),
    };
    if (hasFieldErrors(nextErrors)) {
      setProofFieldErrors(nextErrors);
      setNoticeMessage("Review the highlighted proof fields and try again.", "error");
      return;
    }
    setIsSavingItem(true);
    setNoticeMessage("");
    try {
      let response: Response;
      if (proofFile) {
      if (!proofCategoryId) {
        setNoticeMessage("Select a proof upload category.", "error");
        setIsSavingItem(false);
        return;
      }
      const body = new FormData();
      body.set("category_id", proofCategoryId);
      body.set("item_kind", itemKind);
      body.set("section_code", sectionCode);
      body.set("component_code", componentCode.trim());
      body.set("name", itemName);
      body.set("declared_amount", declaredAmount);
      body.set("title", itemName);
      body.set("file", proofFile);
        response = await fetch(`/api/me/statutory-declarations/${editableDeclaration.id}/proof-upload`, {
          body,
          method: "POST",
        });
      } else {
        response = await fetch(`/api/me/statutory-declarations/${editableDeclaration.id}/items`, {
        body: JSON.stringify({
          component_code: componentCode.trim(),
          config_snapshot: {
            entry_surface_ref: "ess.statutory-declarations",
          },
          declared_amount: declaredAmount,
          item_kind: itemKind,
          name: itemName,
          proof_document_ref: proofDocumentRef.trim(),
          proof_status: proofDocumentRef ? "submitted" : "pending",
          section_code: sectionCode,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        });
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNoticeMessage(apiErrorMessage(result, "Proof item could not be saved."), "error");
        return;
      }
      setItemName("");
      setDeclaredAmount("");
      setProofDocumentRef("");
      setProofFile(null);
      setProofFileInputKey((current) => current + 1);
      setNoticeMessage(proofFile ? "Proof file uploaded and linked." : "Proof item saved.", "success");
      setActiveModal(null);
      refresh();
    } catch {
      setNoticeMessage("Unable to reach the server. Check your connection and try again.", "error");
    } finally {
      setIsSavingItem(false);
    }
  }

  async function handleSubmitDeclaration() {
    if (!editableDeclaration) {
      return;
    }
    setIsSubmitting(true);
    setNoticeMessage("");
    try {
      const response = await fetch(`/api/me/statutory-declarations/${editableDeclaration.id}/submit`, {
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNoticeMessage(apiErrorMessage(result, "Declaration could not be submitted."), "error");
        return;
      }
      setNoticeMessage("Declaration submitted.", "success");
      setActiveModal(null);
      refresh();
    } catch {
      setNoticeMessage("Unable to reach the server. Check your connection and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <main className="shell shell--workspace shell--ess-tax ess-compact accerio-page">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <WorkspaceStandardHeader eyebrow={isDemo ? "Demo employee services" : "Employee services"} title="Statutory Declarations"
        description="Review your tax declaration, provide evidence and follow HR verification."
        actions={<><Link prefetch={false} className="button button--secondary" href="/ess">Overview</Link><Link prefetch={false} className="button button--secondary" href="/ess/documents">Documents</Link></>} />

      <section className="attendance-summary-strip" aria-label="Tax declaration summary">
        <span><strong>{data.summary.declaration_count}</strong> declarations</span>
        <span><strong>{data.summary.draft_declaration_count}</strong> draft</span>
        <span><strong>{data.summary.declaration_item_count}</strong> proofs</span>
        <span><strong>{data.summary.rejected_item_count}</strong> rejected</span>
        <span><strong>{formatMoney(data.summary.declared_total_amount)}</strong> declared</span>
        <span><strong>{formatMoney(data.summary.verified_total_amount)}</strong> accepted</span>
      </section>

      <section className="workspace-section">
        <div className="ess-tax-workspace">
          <TaxYearRail declarations={data.items} filters={filters} selectedDeclaration={selectedDeclaration} />

          <NextActionPanel
            declaration={selectedDeclaration}
            onAddProof={() => setActiveModal("proof")}
            onStartDeclaration={() => setActiveModal("declaration")}
            onSubmit={() => setActiveModal("submit")}
            profile={data.profile}
          />

          <section className="workspace-data-panel ess-tax-main" aria-label="Tax declaration workspace">
            <div className="ess-tax-toolbar">
              <form action="/ess/statutory-declarations">
                <WorkspaceFilterBar>
                  <label className="form-field">
                    <span>Search</span>
                    <input aria-label="Search declarations" className="input-control" defaultValue={filters.q} name="q" placeholder="Year, regime, proof" />
                  </label>
                  <label className="form-field">
                    <span>Status</span>
                    <select aria-label="Status" className="input-control" defaultValue={filters.status} name="status">
                      <option value="">All statuses</option>
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                      <option value="locked">Locked</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Financial year</span>
                    <select aria-label="Financial year" className="input-control" defaultValue={filters.financial_year} name="financial_year">
                      <option value="">All years</option>
                      {data.summary.available_financial_years.map((yearOption) => (
                        <option key={yearOption} value={yearOption}>
                          {yearOption}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Rows per page</span>
                    <select aria-label="Rows per page" className="input-control" defaultValue={String(filters.page_size)} name="page_size">
                      <option value="5">5 / page</option>
                      <option value="10">10 / page</option>
                      <option value="25">25 / page</option>
                    </select>
                  </label>
                  <button className="button button--primary" type="submit">
                    Apply
                  </button>
                </WorkspaceFilterBar>
              </form>
              {notice ? <div className={`notice notice--${noticeTone}`} role={noticeTone === "error" ? "alert" : "status"}>{notice}</div> : null}
            </div>

            <div className="ess-tax-summary-grid">
              <DeclarationSnapshot declaration={selectedDeclaration} />
              <ProfileSummary profile={data.profile} />
            </div>

            <SectionOverview declaration={selectedDeclaration} />
            <ProofRegister items={selectedDeclaration?.items ?? []} onOpenProof={openProofDetail} />

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

        </div>
      </section>

      {activeModal === "declaration" ? (
        <HrAdminActionModal
          focusableBody={readOnlySetup}
          className="accerio-dialog ess-tax-modal"
          closeHref="/ess/statutory-declarations"
          description="Required fields are marked with *."
          eyebrow="Statutory declaration"
          footer={(
            <>
              <span className={`notice notice--${noticeTone}`}>{notice}</span>
              <button className="button button--secondary" disabled={isSavingDeclaration} onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <AsyncActionButton className="button button--primary" disabled={!data.profile || readOnlySetup} form="ess-tax-declaration-form" pending={isSavingDeclaration || isRefreshing} pendingLabel={isSavingDeclaration ? "Saving declaration" : "Refreshing declaration"} type="submit">
                {readOnlySetup ? "Read only" : editableDeclaration ? "Update declaration" : "Create declaration"}
              </AsyncActionButton>
            </>
          )}
          labelledBy="ess-tax-declaration-modal-title"
          onClose={() => setActiveModal(null)}
          title={readOnlySetup ? "Declaration setup" : editableDeclaration ? "Update declaration" : "Start declaration"}
        >
          <form className="ess-tax-modal-form" id="ess-tax-declaration-form" noValidate onSubmit={handleDeclarationSubmit}>
            <label className="form-field">
              <span>Financial year <strong aria-hidden="true">*</strong></span>
              <input aria-invalid={Boolean(declarationFieldErrors.financial_year_code)} className="input-control" onChange={(event) => { setFinancialYearCode(event.target.value); clearDeclarationFieldError("financial_year_code"); }} placeholder="FY2027-28" required disabled={readOnlySetup} value={financialYearCode} />
              {declarationFieldErrors.financial_year_code ? <span className="field-error-text" role="alert">{declarationFieldErrors.financial_year_code}</span> : null}
            </label>
            <label className="form-field">
              <span>Tax regime <strong aria-hidden="true">*</strong></span>
              <select aria-invalid={Boolean(declarationFieldErrors.tax_regime)} className="input-control" onChange={(event) => { setTaxRegime(event.target.value); clearDeclarationFieldError("tax_regime"); }} disabled={readOnlySetup} value={taxRegime}>
                {data.options.tax_regimes.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {declarationFieldErrors.tax_regime ? <span className="field-error-text" role="alert">{declarationFieldErrors.tax_regime}</span> : null}
            </label>
            <label className="form-field">
              <span>Declaration profile</span>
              <input className="input-control" onChange={(event) => setDeclarationProfileRef(event.target.value)} placeholder="Configured declaration profile ref" disabled={readOnlySetup} value={declarationProfileRef} />
            </label>
            <label className="form-field">
              <span>Proof window</span>
              <input className="input-control" onChange={(event) => setProofWindowRef(event.target.value)} placeholder="Configured proof window ref" disabled={readOnlySetup} value={proofWindowRef} />
            </label>
            <div className="ess-tax-helper-card">
              <strong>{taxRegime === "new_regime" ? "New regime selected" : "India statutory guidance"}</strong>
              <span>
                {taxRegime === "new_regime"
                  ? "Most deduction proof is not needed under the new regime, but profile and previous-employer details may still be required by payroll."
                  : "Under the old regime, add relevant proof for 80C, 80D, HRA, home loan, NPS, and previous employer items."}
              </span>
            </div>
          </form>
        </HrAdminActionModal>
      ) : null}

      {activeModal === "proof" ? (
        <HrAdminActionModal
          className="accerio-dialog ess-tax-modal ess-tax-modal--wide"
          closeHref="/ess/statutory-declarations"
          description="Required fields are marked with *."
          eyebrow="Declaration proof"
          footer={(
            <>
              <span className={`notice notice--${notice ? noticeTone : "info"}`}>{notice || (editableDeclaration ? `${editableDeclaration.financial_year_code} accepts draft proof rows.` : "Create or select a draft declaration first.")}</span>
              <button className="button button--secondary" disabled={isSavingItem} onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <AsyncActionButton className="button button--primary" disabled={!editableDeclaration} form="ess-tax-proof-form" pending={isSavingItem || isRefreshing} pendingLabel={isSavingItem ? (proofFile ? "Uploading proof" : "Saving proof") : "Refreshing declaration"} type="submit">
                {proofFile ? "Upload proof" : "Add proof"}
              </AsyncActionButton>
            </>
          )}
          labelledBy="ess-tax-proof-modal-title"
          onClose={() => setActiveModal(null)}
          title="Add proof"
        >
          <form className="ess-tax-modal-form ess-tax-modal-form--wide" id="ess-tax-proof-form" noValidate onSubmit={handleItemSubmit}>
            <label className="form-field">
              <span>Section</span>
              <select className="input-control" disabled={!editableDeclaration} onChange={(event) => setSectionCode(event.target.value)} value={sectionCode}>
                {indianTaxSections.map((section) => (
                  <option value={section.code} key={section.code}>
                    {section.code} - {section.title}
                  </option>
                ))}
                <option value="OTHER">Other deduction</option>
              </select>
            </label>
            <label className="form-field">
              <span>Kind</span>
              <select className="input-control" disabled={!editableDeclaration} onChange={(event) => setItemKind(event.target.value)} value={itemKind}>
                {data.options.statutory_declaration_item_kinds.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Component</span>
              <input className="input-control" disabled={!editableDeclaration} onChange={(event) => setComponentCode(event.target.value)} placeholder="LIC, ELSS, HRA" value={componentCode} />
            </label>
            <label className="form-field">
              <span>Item name <strong aria-hidden="true">*</strong></span>
              <input aria-invalid={Boolean(proofFieldErrors.name)} className="input-control" disabled={!editableDeclaration} onChange={(event) => { setItemName(event.target.value); clearProofFieldError("name"); }} placeholder="Bengaluru rent receipts" required value={itemName} />
              {proofFieldErrors.name ? <span className="field-error-text" role="alert">{proofFieldErrors.name}</span> : null}
            </label>
            <label className="form-field">
              <span>Amount <strong aria-hidden="true">*</strong></span>
              <input aria-invalid={Boolean(proofFieldErrors.declared_amount)} className="input-control" disabled={!editableDeclaration} inputMode="decimal" onChange={(event) => { setDeclaredAmount(event.target.value); clearProofFieldError("declared_amount"); }} placeholder="0.00" required value={declaredAmount} />
              {proofFieldErrors.declared_amount ? <span className="field-error-text" role="alert">{proofFieldErrors.declared_amount}</span> : null}
            </label>
            <label className="form-field">
              <span>Proof reference</span>
              <input className="input-control" disabled={!editableDeclaration} onChange={(event) => setProofDocumentRef(event.target.value)} placeholder="employee-document reference" value={proofDocumentRef} />
            </label>
            <label className="form-field">
              <span>Upload category</span>
              <select aria-invalid={Boolean(proofFieldErrors.proof_category_id)} className="input-control" disabled={!editableDeclaration || data.options.proof_upload_categories.length === 0} onChange={(event) => { setProofCategoryId(event.target.value); clearProofFieldError("proof_category_id"); }} value={proofCategoryId}>
                <option value="">Select category</option>
                {data.options.proof_upload_categories.map((option) => (
                  <option value={option.id} key={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {proofFieldErrors.proof_category_id ? <span className="field-error-text" role="alert">{proofFieldErrors.proof_category_id}</span> : null}
            </label>
            <label className="form-field">
              <span>Proof file</span>
              <input accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" aria-invalid={Boolean(proofFieldErrors.proof_file)} className="input-control" disabled={!editableDeclaration || data.options.proof_upload_categories.length === 0} key={proofFileInputKey} onChange={(event) => { setProofFile(event.target.files?.[0] ?? null); clearProofFieldError("proof_file"); clearProofFieldError("proof_category_id"); }} type="file" />
              {proofFieldErrors.proof_file ? <span className="field-error-text" role="alert">{proofFieldErrors.proof_file}</span> : null}
            </label>
            <div className="ess-tax-helper-card ess-tax-helper-card--wide">
              <strong>Proof quality check</strong>
              <span>Use clear files with employee name, financial year, amount, and issuer details visible. HR may reject incomplete or unreadable evidence.</span>
            </div>
          </form>
        </HrAdminActionModal>
      ) : null}

      {activeModal === "submit" ? (
        <HrAdminActionModal
          focusableBody
          className="accerio-dialog ess-tax-modal"
          closeHref="/ess/statutory-declarations"
          description="After submission, HR can verify proof and payroll may lock the declaration for the cycle."
          eyebrow="Statutory declaration"
          footer={(
            <>
              <span className={`notice notice--${notice ? noticeTone : "info"}`}>{notice || "Confirm only after proof rows are correct."}</span>
              <button className="button button--secondary" disabled={isSubmitting} onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <AsyncActionButton className="button button--primary" disabled={!editableDeclaration} onClick={handleSubmitDeclaration} pending={isSubmitting || isRefreshing} pendingLabel={isSubmitting ? "Submitting declaration" : "Refreshing declaration"} type="button">
                Submit declaration
              </AsyncActionButton>
            </>
          )}
          labelledBy="ess-tax-submit-modal-title"
          onClose={() => setActiveModal(null)}
          title="Submit declaration"
        >
          <div className="ess-tax-submit-summary">
            <DetailRow label="Financial year" value={editableDeclaration?.financial_year_code || "Pending"} />
            <DetailRow label="Declared amount" value={formatMoney(editableDeclaration?.declared_total_amount)} />
            <DetailRow label="Proof rows" value={editableDeclaration?.item_count ?? 0} />
            <DetailRow label="Rejected rows" value={editableDeclaration?.rejected_item_count ?? 0} />
          </div>
        </HrAdminActionModal>
      ) : null}

      {activeModal === "proofDetail" && selectedProof ? (
        <HrAdminActionModal
          focusableBody
          className="accerio-dialog ess-tax-modal"
          closeHref="/ess/statutory-declarations"
          description={selectedProof.name}
          eyebrow="Proof detail"
          footer={<button className="button button--primary" onClick={() => setActiveModal(null)} type="button">Close</button>}
          labelledBy="ess-tax-proof-detail-modal-title"
          onClose={() => setActiveModal(null)}
          title="Proof detail"
        >
          <div className="detail-grid detail-grid-soft">
            <DetailRow label="Section" value={selectedProof.section_code} />
            <DetailRow label="Component" value={selectedProof.component_code || selectedProof.item_kind_label} />
            <DetailRow label="Declared" value={formatMoney(selectedProof.declared_amount)} />
            <DetailRow label="Accepted" value={formatMoney(selectedProof.verified_amount)} />
            <DetailRow label="Proof status" value={<StatusBadge status={selectedProof.proof_status} label={selectedProof.proof_status_label} />} />
            <DetailRow label="Proof reference" value={selectedProof.proof_document_ref || selectedProof.proof_artifact_key || "Pending"} />
            <DetailRow label="Submitted" value={formatDate(selectedProof.proof_submitted_at)} />
            <DetailRow label="Verified" value={formatDate(selectedProof.verified_at)} />
          </div>
          {selectedProof.rejection_reason ? (
            <div className="ess-tax-helper-card is-warning">
              <strong>Rejection reason</strong>
              <span>{selectedProof.rejection_reason}</span>
            </div>
          ) : null}
        </HrAdminActionModal>
      ) : null}
    </main>
  );
}
