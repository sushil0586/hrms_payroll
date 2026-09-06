"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { EssStatutoryDeclaration, EssStatutoryDeclarationListResponse } from "@/lib/types";

type Props = {
  data: EssStatutoryDeclarationListResponse;
  selectedDeclaration: EssStatutoryDeclaration | null;
};

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

function isEditable(declaration: EssStatutoryDeclaration | null) {
  return declaration?.status === "draft" || declaration?.status === "rejected";
}

export function StatutoryDeclarationActions({ data, selectedDeclaration }: Props) {
  const router = useRouter();
  const editableDeclaration = isEditable(selectedDeclaration) ? selectedDeclaration : null;
  const profile = data.profile;
  const defaultFinancialYear = useMemo(() => {
    const snapshotValue = profile?.config_snapshot?.default_declaration_financial_year;
    return typeof snapshotValue === "string" ? snapshotValue : data.summary.available_financial_years[0] ?? "";
  }, [data.summary.available_financial_years, profile?.config_snapshot]);
  const defaultProofWindow = useMemo(() => {
    const snapshotValue = profile?.config_snapshot?.default_proof_window_ref;
    return typeof snapshotValue === "string" ? snapshotValue : selectedDeclaration?.proof_window_ref ?? "";
  }, [profile?.config_snapshot, selectedDeclaration?.proof_window_ref]);

  const [financialYearCode, setFinancialYearCode] = useState(editableDeclaration?.financial_year_code ?? defaultFinancialYear);
  const [taxRegime, setTaxRegime] = useState(editableDeclaration?.tax_regime ?? profile?.tax_regime ?? "not_declared");
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
  const [isSavingDeclaration, setIsSavingDeclaration] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleDeclarationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingDeclaration(true);
    setNotice("");
    const payload: Record<string, unknown> = {
      employee_statutory_profile_id: profile?.id,
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
      method: editableDeclaration ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    setIsSavingDeclaration(false);
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Declaration could not be saved."));
      return;
    }
    setNotice("Declaration saved.");
    router.refresh();
  }

  async function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editableDeclaration) {
      setNotice("Select a draft or rejected declaration first.");
      return;
    }
    setIsSavingItem(true);
    setNotice("");
    let response: Response;
    if (proofFile) {
      if (!proofCategoryId) {
        setNotice("Select a proof upload category.");
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
        method: "POST",
        body,
      });
    } else {
      response = await fetch(`/api/me/statutory-declarations/${editableDeclaration.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_kind: itemKind,
          section_code: sectionCode,
          component_code: componentCode.trim(),
          name: itemName,
          declared_amount: declaredAmount,
          proof_document_ref: proofDocumentRef.trim(),
          proof_status: proofDocumentRef ? "submitted" : "pending",
          config_snapshot: {
            entry_surface_ref: "ess.statutory-declarations",
          },
        }),
      });
    }
    const result = await response.json().catch(() => ({}));
    setIsSavingItem(false);
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Proof item could not be saved."));
      return;
    }
    setItemName("");
    setDeclaredAmount("");
    setProofDocumentRef("");
    setProofFile(null);
    setProofFileInputKey((current) => current + 1);
    setNotice(proofFile ? "Proof file uploaded and linked." : "Proof item saved.");
    router.refresh();
  }

  async function handleSubmitDeclaration() {
    if (!editableDeclaration) {
      return;
    }
    setIsSubmitting(true);
    setNotice("");
    const response = await fetch(`/api/me/statutory-declarations/${editableDeclaration.id}/submit`, {
      method: "POST",
    });
    const result = await response.json().catch(() => ({}));
    setIsSubmitting(false);
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Declaration could not be submitted."));
      return;
    }
    setNotice("Declaration submitted.");
    router.refresh();
  }

  return (
    <section className="payroll-statutory-action-panel" aria-label="Statutory declaration actions">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Employee submission</span>
          <h2>{editableDeclaration ? "Update declaration" : "Start declaration"}</h2>
        </div>
        <button
          className="button button--primary"
          type="button"
          onClick={handleSubmitDeclaration}
          disabled={!editableDeclaration || isSubmitting}
        >
          {isSubmitting ? "Submitting" : "Submit"}
        </button>
      </div>

      <form className="payroll-statutory-action-grid" onSubmit={handleDeclarationSubmit}>
        <label>
          <span>Financial year</span>
          <input value={financialYearCode} onChange={(event) => setFinancialYearCode(event.target.value)} placeholder="FY2027-28" required />
        </label>
        <label>
          <span>Tax regime</span>
          <select value={taxRegime} onChange={(event) => setTaxRegime(event.target.value)}>
            {data.options.tax_regimes.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Declaration profile</span>
          <input value={declarationProfileRef} onChange={(event) => setDeclarationProfileRef(event.target.value)} placeholder="Configured declaration profile ref" />
        </label>
        <label>
          <span>Proof window</span>
          <input value={proofWindowRef} onChange={(event) => setProofWindowRef(event.target.value)} placeholder="Configured proof window ref" />
        </label>
        <div className="payroll-statutory-action-buttons">
          <button className="button button--secondary" type="submit" disabled={!profile || isSavingDeclaration}>
            {isSavingDeclaration ? "Saving" : editableDeclaration ? "Update" : "Create"}
          </button>
        </div>
      </form>

      <form className="payroll-statutory-action-grid" onSubmit={handleItemSubmit}>
        <label>
          <span>Section</span>
          <input value={sectionCode} onChange={(event) => setSectionCode(event.target.value)} placeholder="80C" disabled={!editableDeclaration} required />
        </label>
        <label>
          <span>Kind</span>
          <select value={itemKind} onChange={(event) => setItemKind(event.target.value)} disabled={!editableDeclaration}>
            {data.options.statutory_declaration_item_kinds.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Component</span>
          <input value={componentCode} onChange={(event) => setComponentCode(event.target.value)} placeholder="LIC" disabled={!editableDeclaration} />
        </label>
        <label>
          <span>Item name</span>
          <input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Proof item name" disabled={!editableDeclaration} required />
        </label>
        <label>
          <span>Amount</span>
          <input value={declaredAmount} onChange={(event) => setDeclaredAmount(event.target.value)} inputMode="decimal" placeholder="0.00" disabled={!editableDeclaration} required />
        </label>
        <label>
          <span>Proof reference</span>
          <input value={proofDocumentRef} onChange={(event) => setProofDocumentRef(event.target.value)} placeholder="employee-document reference" disabled={!editableDeclaration} />
        </label>
        <label>
          <span>Upload category</span>
          <select value={proofCategoryId} onChange={(event) => setProofCategoryId(event.target.value)} disabled={!editableDeclaration || data.options.proof_upload_categories.length === 0}>
            <option value="">Select category</option>
            {data.options.proof_upload_categories.map((option) => (
              <option value={option.id} key={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Proof file</span>
          <input key={proofFileInputKey} type="file" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} disabled={!editableDeclaration || data.options.proof_upload_categories.length === 0} />
        </label>
        <div className="payroll-statutory-action-buttons">
          <button className="button button--secondary" type="submit" disabled={!editableDeclaration || isSavingItem}>
            {isSavingItem ? "Saving" : proofFile ? "Upload Proof" : "Add Proof"}
          </button>
        </div>
      </form>

      <div className="payroll-statutory-action-state" role="status">
        {notice || (editableDeclaration ? `${editableDeclaration.financial_year_code} is open for employee edits.` : "Create or select a draft declaration to add proof rows.")}
      </div>
    </section>
  );
}
