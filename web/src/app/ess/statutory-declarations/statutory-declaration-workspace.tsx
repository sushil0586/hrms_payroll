"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { ActionToast } from "@/components/patterns/action-toast";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { type FieldErrors, hasFieldErrors, requireText, requireValue, validateUploadFile } from "@/lib/ui/validation";
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

function formatDate(value: string | null | undefined) {
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

function isEditable(declaration: EssStatutoryDeclaration | null) {
  return declaration?.status === "draft" || declaration?.status === "rejected";
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

function ModalShell({
  children,
  label,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  wide?: boolean;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="modal-shell" role="presentation">
      <div aria-label={label} aria-modal="true" className={`modal ess-tax-modal${wide ? " ess-tax-modal--wide" : ""}`} role="dialog">
        {children}
      </div>
    </div>,
    document.body,
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return (
    <article className="workspace-summary-card">
      <div className="workspace-summary-card__meta">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
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
        <DetailRow label="PAN" value={profile?.pan_number || "Pending"} />
        <DetailRow label="Tax regime" value={profile?.tax_regime_label || "Pending"} />
        <DetailRow label="PF / UAN" value={profile?.pf_applicable ? profile.uan_number || "Applicable" : "Not applicable"} />
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
      <details className="workspace-filter-disclosure ess-tax-register-filters" open>
        <summary>Refine proof register</summary>
        <div className="workspace-filter-disclosure__content ess-tax-register-filter-grid">
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
        </div>
      </details>
      <div className="workspace-table ess-tax-proof-list">
        <div className="workspace-table__row workspace-table__row--head ess-tax-proof-row">
          <span>Proof</span>
          <span>Status</span>
          <span>Declared</span>
          <span>Accepted</span>
          <span>Action</span>
        </div>
        {filteredItems.map((item) => (
          <button className="workspace-table__row ess-tax-proof-row ess-tax-proof-card" key={item.id} onClick={() => onOpenProof(item)} type="button">
            <span>
              <strong>{item.name}</strong>
              <small>
                {item.section_code} / {item.component_code || item.item_kind_label}
              </small>
            </span>
            <StatusBadge status={item.proof_status} label={item.proof_status_label} />
            <span>{formatMoney(item.declared_amount)}</span>
            <span>{formatMoney(item.verified_amount)}</span>
            <span className="table-action-link">View details</span>
          </button>
        ))}
        {filteredItems.length === 0 ? (
          <div className="ess-tax-empty-card">
            <strong>No proof rows match</strong>
            <span>Clear filters or add a proof to this declaration.</span>
          </div>
        ) : null}
      </div>
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
          <strong>{needsPan ? "PAN missing" : "PAN ready"}</strong>
          <span>{needsPan ? "Ask HR to update PAN before payroll consumes tax data." : profile?.pan_number}</span>
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
        <button className="button button--primary" onClick={onStartDeclaration} type="button">
          {editable ? "Update declaration" : declaration ? "View setup" : "Start declaration"}
        </button>
        <button className="button button--secondary" disabled={!editable} onClick={onAddProof} type="button">
          Add proof
        </button>
        <button className="button button--secondary" disabled={!editable || (declaration?.item_count ?? 0) === 0} onClick={onSubmit} type="button">
          Submit declaration
        </button>
      </div>
    </section>
  );
}

export function StatutoryDeclarationWorkspace({ data, filters, isDemo, selectedDeclarationId }: Props) {
  const router = useRouter();
  const selectedDeclaration = data.items.find((item) => item.id === selectedDeclarationId) ?? data.items[0] ?? null;
  const editableDeclaration = isEditable(selectedDeclaration) ? selectedDeclaration : null;
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

  const [financialYearCode, setFinancialYearCode] = useState(editableDeclaration?.financial_year_code ?? defaultFinancialYear);
  const [taxRegime, setTaxRegime] = useState(editableDeclaration?.tax_regime ?? data.profile?.tax_regime ?? "not_declared");
  const [declarationProfileRef, setDeclarationProfileRef] = useState(editableDeclaration?.declaration_profile_ref ?? "");
  const [proofWindowRef, setProofWindowRef] = useState(editableDeclaration?.proof_window_ref ?? defaultProofWindow);
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

  useEffect(() => {
    if (!activeModal) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveModal(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeModal]);

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
    const response = await fetch(endpoint, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: editableDeclaration ? "PATCH" : "POST",
    });
    const result = await response.json().catch(() => ({}));
    setIsSavingDeclaration(false);
    if (!response.ok) {
      setNoticeMessage(apiErrorMessage(result, "Declaration could not be saved."), "error");
      return;
    }
    setNoticeMessage("Declaration saved.", "success");
    setActiveModal(null);
    window.setTimeout(() => router.refresh(), 900);
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
    setIsSavingItem(false);
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
    window.setTimeout(() => router.refresh(), 900);
  }

  async function handleSubmitDeclaration() {
    if (!editableDeclaration) {
      return;
    }
    setIsSubmitting(true);
    setNoticeMessage("");
    const response = await fetch(`/api/me/statutory-declarations/${editableDeclaration.id}/submit`, {
      method: "POST",
    });
    const result = await response.json().catch(() => ({}));
    setIsSubmitting(false);
    if (!response.ok) {
      setNoticeMessage(apiErrorMessage(result, "Declaration could not be submitted."), "error");
      return;
    }
    setNoticeMessage("Declaration submitted.", "success");
    setActiveModal(null);
    window.setTimeout(() => router.refresh(), 900);
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <main className="shell shell--workspace shell--ess-tax">
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <header className="workspace-control-header">
        <div className="workspace-control-header__copy">
          <span className="workspace-control-header__eyebrow">{isDemo ? "Demo employee tax" : "Live employee tax"}</span>
          <h1>Statutory Declarations</h1>
          <p>Choose tax regime, add investment proof, and track HR verification in one focused self-service workspace.</p>
          <div className="workspace-control-header__metrics">
            <span>India ready</span>
            <span>Tenant configured</span>
            <span>Proof tracked</span>
          </div>
        </div>
        <div className="workspace-control-header__actions">
          <Link className="button button--secondary" href="/ess">
            Overview
          </Link>
          <Link className="button button--secondary" href="/ess/documents">
            Documents
          </Link>
        </div>
      </header>

      <section className="workspace-summary-grid ess-tax-summary-grid--metrics" aria-label="Tax declaration metrics">
        <SummaryCard label="Declarations" value={data.summary.declaration_count} hint="Tax years in view" />
        <SummaryCard label="Draft" value={data.summary.draft_declaration_count} hint="Editable declarations" />
        <SummaryCard label="Proofs" value={data.summary.declaration_item_count} hint="Declared proof rows" />
        <SummaryCard label="Rejected" value={data.summary.rejected_item_count} hint="Need correction" />
        <SummaryCard label="Declared" value={formatMoney(data.summary.declared_total_amount)} hint="Employee total" />
        <SummaryCard label="Accepted" value={formatMoney(data.summary.verified_total_amount)} hint="Payroll accepted" />
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
              <details className="workspace-filter-disclosure" open>
                <summary>Refine declarations</summary>
                <form action="/ess/statutory-declarations" className="workspace-filter-disclosure__content ess-tax-filter-form">
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
                </form>
              </details>
              {notice ? <div className={`notice notice--${noticeTone}`}>{notice}</div> : null}
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
        <ModalShell label={editableDeclaration ? "Update declaration" : "Start declaration"} onClose={() => setActiveModal(null)}>
          <div className="modal__header">
            <div>
              <h2>{editableDeclaration ? "Update declaration" : "Start declaration"}</h2>
              <p>Choose financial year and tax regime. This keeps proof work tied to the right payroll year.</p>
            </div>
            <button className="button button--secondary" onClick={() => setActiveModal(null)} type="button">
              Close
            </button>
          </div>
          <form className="ess-tax-modal-form" noValidate onSubmit={handleDeclarationSubmit}>
            <label className="form-field">
              <span>Financial year</span>
              <input aria-invalid={Boolean(declarationFieldErrors.financial_year_code)} className="input-control" onChange={(event) => { setFinancialYearCode(event.target.value); clearDeclarationFieldError("financial_year_code"); }} placeholder="FY2027-28" required value={financialYearCode} />
              {declarationFieldErrors.financial_year_code ? <span className="field-error-text" role="alert">{declarationFieldErrors.financial_year_code}</span> : null}
            </label>
            <label className="form-field">
              <span>Tax regime</span>
              <select aria-invalid={Boolean(declarationFieldErrors.tax_regime)} className="input-control" onChange={(event) => { setTaxRegime(event.target.value); clearDeclarationFieldError("tax_regime"); }} value={taxRegime}>
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
              <input className="input-control" onChange={(event) => setDeclarationProfileRef(event.target.value)} placeholder="Configured declaration profile ref" value={declarationProfileRef} />
            </label>
            <label className="form-field">
              <span>Proof window</span>
              <input className="input-control" onChange={(event) => setProofWindowRef(event.target.value)} placeholder="Configured proof window ref" value={proofWindowRef} />
            </label>
            <div className="ess-tax-helper-card">
              <strong>{taxRegime === "new_regime" ? "New regime selected" : "India statutory guidance"}</strong>
              <span>
                {taxRegime === "new_regime"
                  ? "Most deduction proof is not needed under the new regime, but profile and previous-employer details may still be required by payroll."
                  : "Under the old regime, add relevant proof for 80C, 80D, HRA, home loan, NPS, and previous employer items."}
              </span>
            </div>
            <div className="ess-tax-modal-actions">
              <span className={`notice notice--${noticeTone}`}>{notice}</span>
              <button className="button button--primary" disabled={!data.profile || isSavingDeclaration} type="submit">
                {isSavingDeclaration ? "Saving" : editableDeclaration ? "Update declaration" : "Create declaration"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === "proof" ? (
        <ModalShell label="Add proof" onClose={() => setActiveModal(null)} wide>
          <div className="modal__header">
            <div>
              <h2>Add proof</h2>
              <p>Add one proof row at a time. Upload a file when available, or record a proof reference for HR review.</p>
            </div>
            <button className="button button--secondary" onClick={() => setActiveModal(null)} type="button">
              Close
            </button>
          </div>
          <form className="ess-tax-modal-form ess-tax-modal-form--wide" noValidate onSubmit={handleItemSubmit}>
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
              <span>Item name</span>
              <input aria-invalid={Boolean(proofFieldErrors.name)} className="input-control" disabled={!editableDeclaration} onChange={(event) => { setItemName(event.target.value); clearProofFieldError("name"); }} placeholder="Bengaluru rent receipts" required value={itemName} />
              {proofFieldErrors.name ? <span className="field-error-text" role="alert">{proofFieldErrors.name}</span> : null}
            </label>
            <label className="form-field">
              <span>Amount</span>
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
            <div className="ess-tax-modal-actions">
              <span className={`notice notice--${notice ? noticeTone : "info"}`}>{notice || (editableDeclaration ? `${editableDeclaration.financial_year_code} accepts draft proof rows.` : "Create or select a draft declaration first.")}</span>
              <button className="button button--primary" disabled={!editableDeclaration || isSavingItem} type="submit">
                {isSavingItem ? "Saving" : proofFile ? "Upload proof" : "Add proof"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === "submit" ? (
        <ModalShell label="Submit declaration" onClose={() => setActiveModal(null)}>
          <div className="modal__header">
            <div>
              <h2>Submit declaration</h2>
              <p>After submission, HR can verify proof and payroll may lock the declaration for the cycle.</p>
            </div>
            <button className="button button--secondary" onClick={() => setActiveModal(null)} type="button">
              Close
            </button>
          </div>
          <div className="ess-tax-submit-summary">
            <DetailRow label="Financial year" value={editableDeclaration?.financial_year_code || "Pending"} />
            <DetailRow label="Declared amount" value={formatMoney(editableDeclaration?.declared_total_amount)} />
            <DetailRow label="Proof rows" value={editableDeclaration?.item_count ?? 0} />
            <DetailRow label="Rejected rows" value={editableDeclaration?.rejected_item_count ?? 0} />
          </div>
          <div className="ess-tax-modal-actions">
            <span className={`notice notice--${notice ? noticeTone : "info"}`}>{notice || "Confirm only after proof rows are correct."}</span>
            <button className="button button--primary" disabled={!editableDeclaration || isSubmitting} onClick={handleSubmitDeclaration} type="button">
              {isSubmitting ? "Submitting" : "Submit declaration"}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "proofDetail" && selectedProof ? (
        <ModalShell label="Proof detail" onClose={() => setActiveModal(null)}>
          <div className="modal__header">
            <div>
              <h2>Proof detail</h2>
              <p>{selectedProof.name}</p>
            </div>
            <button className="button button--secondary" onClick={() => setActiveModal(null)} type="button">
              Close
            </button>
          </div>
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
        </ModalShell>
      ) : null}
    </main>
  );
}
