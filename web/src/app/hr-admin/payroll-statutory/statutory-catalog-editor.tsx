"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminEnumOption, HrAdminPayrollStatutoryPack, StatutoryDeclarationCatalog } from "@/lib/types";

import { StatutoryYearLifecycleActions } from "./statutory-year-lifecycle-actions";

type CatalogDraft = Omit<StatutoryDeclarationCatalog, "source">;

function catalogFromPack(pack: HrAdminPayrollStatutoryPack): CatalogDraft {
  const configured = pack.config_snapshot.declaration_catalog;
  if (configured && typeof configured === "object") {
    const value = configured as Partial<CatalogDraft>;
    if (Array.isArray(value.financial_years) && Array.isArray(value.sections)) {
      return {
        financial_years: value.financial_years.map((year) => ({ ...year })),
        sections: value.sections.map((section) => ({
          ...section,
          item_kinds: [...section.item_kinds],
          component_codes: [...section.component_codes],
        })),
      };
    }
  }
  return { financial_years: [], sections: [] };
}

function errorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "The statutory catalog could not be saved.";
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  if (Array.isArray(record.config_snapshot)) return record.config_snapshot.join(" ");
  if (typeof record.config_snapshot === "string") return record.config_snapshot;
  return "The statutory catalog could not be saved. Review the highlighted configuration and try again.";
}

export function StatutoryCatalogEditor({
  canManage,
  canApprove,
  itemKindOptions,
  packs,
}: {
  canManage: boolean;
  canApprove: boolean;
  itemKindOptions: HrAdminEnumOption[];
  packs: HrAdminPayrollStatutoryPack[];
}) {
  const router = useRouter();
  const [selectedPackId, setSelectedPackId] = useState(packs[0]?.id ?? "");
  const selectedPack = useMemo(() => packs.find((pack) => pack.id === selectedPackId) ?? null, [packs, selectedPackId]);
  const [draft, setDraft] = useState<CatalogDraft>(() => (packs[0] ? catalogFromPack(packs[0]) : { financial_years: [], sections: [] }));
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function selectPack(packId: string) {
    const pack = packs.find((item) => item.id === packId);
    setSelectedPackId(packId);
    setDraft(pack ? catalogFromPack(pack) : { financial_years: [], sections: [] });
    setStatus(null);
  }

  async function saveCatalog() {
    if (!selectedPack) return;
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/hr-admin/payroll-statutory-packs/${selectedPack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_snapshot: {
            ...selectedPack.config_snapshot,
            declaration_catalog: draft,
          },
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(payload));
      setStatus({ tone: "success", message: "Declaration catalog saved and recorded in the statutory audit trail." });
      router.refresh();
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "The statutory catalog could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="workspace-card" aria-labelledby="declaration-catalog-heading">
      <div className="workspace-card__header">
        <div>
          <span className="workspace-card__eyebrow">Employee declaration controls</span>
          <h2 id="declaration-catalog-heading">Declaration catalog</h2>
          <p className="section-copy section-copy-soft">Control available financial years, proof windows, statutory sections, declaration types, and permitted component choices.</p>
        </div>
        <span className="payroll-setup-count">{draft.financial_years.length} years / {draft.sections.length} sections</span>
      </div>

      <label className="field-shell">
        <span>Statutory pack</span>
        <select disabled={saving} value={selectedPackId} onChange={(event) => selectPack(event.target.value)}>
          {packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} ({pack.code})</option>)}
        </select>
      </label>

      {!selectedPack ? <div className="empty-state">Create a statutory pack before configuring employee declaration choices.</div> : null}

      {selectedPack ? (
        <>
          <div className="payroll-setup-record-stack">
            <div className="workspace-card__header">
              <div><h3>Financial years</h3><p className="section-copy section-copy-soft">Only open years can receive new employee declarations.</p></div>
              {canManage ? <button className="button button--secondary" type="button" onClick={() => setDraft((current) => ({
                ...current,
                financial_years: [...current.financial_years, { value: "", label: "", is_open: true, declaration_profile_ref: "payroll.statutory.declaration.india.default.v1", proof_window_ref: "annual-proof-window" }],
              }))}>Add year</button> : null}
            </div>
            {draft.financial_years.map((year, index) => (
              <div className="salary-crud-form" key={`${year.value}-${index}`}>
                <div className="form-grid form-grid--three">
                  <label className="field-shell"><span>Year code</span><input disabled={!canManage || saving} value={year.value} onChange={(event) => setDraft((current) => ({ ...current, financial_years: current.financial_years.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value.toUpperCase() } : item) }))} /></label>
                  <label className="field-shell"><span>Display label</span><input disabled={!canManage || saving} value={year.label} onChange={(event) => setDraft((current) => ({ ...current, financial_years: current.financial_years.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} /></label>
                  <label className="field-shell"><span>Proof window</span><input disabled={!canManage || saving} value={year.proof_window_ref} onChange={(event) => setDraft((current) => ({ ...current, financial_years: current.financial_years.map((item, itemIndex) => itemIndex === index ? { ...item, proof_window_ref: event.target.value } : item) }))} /></label>
                  <label className="field-shell field-shell--wide"><span>Declaration profile</span><input disabled={!canManage || saving} value={year.declaration_profile_ref} onChange={(event) => setDraft((current) => ({ ...current, financial_years: current.financial_years.map((item, itemIndex) => itemIndex === index ? { ...item, declaration_profile_ref: event.target.value } : item) }))} /></label>
                  <div className="field-shell"><span>Lifecycle state</span><strong>{year.is_open ? "Open" : "Closed"}</strong></div>
                </div>
                {year.value ? <StatutoryYearLifecycleActions canApprove={canManage && canApprove} isOpen={year.is_open} onCompleted={(pack) => setDraft(catalogFromPack(pack))} packId={selectedPack.id} yearCode={year.value} /> : null}
                {canManage ? <button className="button button--quiet" type="button" onClick={() => setDraft((current) => ({ ...current, financial_years: current.financial_years.filter((_, itemIndex) => itemIndex !== index) }))}>Remove year</button> : null}
              </div>
            ))}
          </div>

          <div className="payroll-setup-record-stack">
            <div className="workspace-card__header">
              <div><h3>Declaration sections</h3><p className="section-copy section-copy-soft">Employees choose from these governed options instead of entering statutory classifications manually.</p></div>
              {canManage ? <button className="button button--secondary" type="button" onClick={() => setDraft((current) => ({ ...current, sections: [...current.sections, { code: "", label: "", item_kinds: [itemKindOptions[0]?.value ?? "investment"], component_codes: [], proof_required: true }] }))}>Add section</button> : null}
            </div>
            {draft.sections.map((section, index) => (
              <div className="salary-crud-form" key={`${section.code}-${index}`}>
                <div className="form-grid form-grid--three">
                  <label className="field-shell"><span>Section code</span><input disabled={!canManage || saving} value={section.code} onChange={(event) => setDraft((current) => ({ ...current, sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, code: event.target.value.toUpperCase() } : item) }))} /></label>
                  <label className="field-shell"><span>Section label</span><input disabled={!canManage || saving} value={section.label} onChange={(event) => setDraft((current) => ({ ...current, sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} /></label>
                  <label className="field-shell"><span>Component choices</span><input disabled={!canManage || saving} value={section.component_codes.join(", ")} placeholder="LIC, ELSS, PPF" onChange={(event) => setDraft((current) => ({ ...current, sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, component_codes: event.target.value.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean) } : item) }))} /></label>
                </div>
                <fieldset className="field-shell"><legend>Allowed declaration types</legend><div className="checkbox-cluster">{itemKindOptions.map((option) => <label className="checkbox-row" key={option.value}><input checked={section.item_kinds.includes(option.value)} disabled={!canManage || saving} type="checkbox" onChange={(event) => setDraft((current) => ({ ...current, sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, item_kinds: event.target.checked ? [...new Set([...item.item_kinds, option.value])] : item.item_kinds.filter((value) => value !== option.value) } : item) }))} /><span>{option.label}</span></label>)}</div></fieldset>
                <label className="checkbox-row"><input checked={section.proof_required} disabled={!canManage || saving} type="checkbox" onChange={(event) => setDraft((current) => ({ ...current, sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, proof_required: event.target.checked } : item) }))} /><span>Proof required before submission</span></label>
                {canManage ? <button className="button button--quiet" type="button" onClick={() => setDraft((current) => ({ ...current, sections: current.sections.filter((_, itemIndex) => itemIndex !== index) }))}>Remove section</button> : null}
              </div>
            ))}
          </div>

          {status ? <p className={`form-status form-status--${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>{status.message}</p> : null}
          {canManage ? <div className="button-row"><button className="button button--primary" disabled={saving} type="button" onClick={() => void saveCatalog()}>{saving ? "Saving catalog..." : "Save declaration catalog"}</button><button className="button button--secondary" disabled={saving} type="button" onClick={() => setDraft(catalogFromPack(selectedPack))}>Reset changes</button></div> : null}
        </>
      ) : null}
    </section>
  );
}
