"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { PlatformPermissionCatalogItem } from "@/lib/types";

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function apiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  const firstEntry = Object.values(record).find((value) => Array.isArray(value) || typeof value === "string");
  if (Array.isArray(firstEntry) && firstEntry.length) return String(firstEntry[0]);
  if (typeof firstEntry === "string") return firstEntry;
  return fallback;
}

type Props = {
  permission: PlatformPermissionCatalogItem;
  moduleOptions: string[];
};

type FormState = {
  label: string;
  module: string;
  description: string;
  risk_level: string;
  tenant_assignable: boolean;
  required_module: string;
  required_plan: string;
  is_active: boolean;
};

function buildFormState(permission: PlatformPermissionCatalogItem): FormState {
  return {
    label: permission.label,
    module: permission.module,
    description: permission.description,
    risk_level: permission.risk_level,
    tenant_assignable: permission.tenant_assignable,
    required_module: permission.required_module,
    required_plan: permission.required_plan,
    is_active: permission.is_active ?? true,
  };
}

export function PermissionCatalogActions({ permission, moduleOptions }: Props) {
  const router = useRouter();
  const labelRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<PlatformPermissionCatalogItem | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (editing) labelRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing]);

  function openDialog(permission: PlatformPermissionCatalogItem) {
    setEditing(permission);
    setForm(buildFormState(permission));
    setFormError("");
    setNotice("");
  }

  function closeDialog() {
    setEditing(null);
    setForm(null);
    setFormError("");
    setBusy(false);
  }

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function savePermission() {
    if (!editing || !form) return;
    if (!form.label.trim()) {
      setFormError("Permission label is required.");
      return;
    }
    if (!form.module.trim()) {
      setFormError("Module is required.");
      return;
    }
    setBusy(true);
    setFormError("");
    const response = await fetch(`/api/platform/permission-catalog/${encodeURIComponent(editing.key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label.trim(),
        module: form.module.trim(),
        description: form.description.trim(),
        risk_level: form.risk_level,
        tenant_assignable: form.tenant_assignable,
        required_module: form.required_module.trim(),
        required_plan: form.required_plan.trim(),
        is_active: form.is_active,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setFormError(apiErrorMessage(payload, "Permission could not be updated."));
      return;
    }
    setNotice(`${editing.key} updated.`);
    closeDialog();
    router.refresh();
  }

  return (
    <>
      <button className="button button--secondary" onClick={() => openDialog(permission)} type="button">
        Edit
      </button>
      {notice ? <span className="muted">{notice}</span> : null}

      {editing && form ? (
        <div className="tenant-modal-shell" role="presentation">
          <div aria-describedby="permission-dialog-validation" aria-label="Edit platform permission" aria-modal="true" className="tenant-modal" role="dialog">
            <div className="tenant-modal__header">
              <div>
                <span className="workspace-card__eyebrow">Permission catalog</span>
                <h3>Edit permission</h3>
              </div>
              <button aria-label="Close permission dialog" className="button button--ghost" onClick={closeDialog} type="button">
                Close
              </button>
            </div>
            <div className="tenant-modal__member-summary">
              <span className="muted">Key</span>
              <strong>{editing.key}</strong>
              <span className="muted">Keys are immutable. Runtime enforcement still uses the deployed permission key contract.</span>
            </div>
            <div className="tenant-membership-form-grid tenant-membership-form-grid--dialog">
              <label>
                Label
                <input ref={labelRef} value={form.label} onChange={(event) => updateForm("label", event.target.value)} />
              </label>
              <label>
                Module
                <input list="permission-module-options" value={form.module} onChange={(event) => updateForm("module", event.target.value)} />
                <datalist id="permission-module-options">
                  {moduleOptions.map((module) => (
                    <option key={module} value={module} />
                  ))}
                </datalist>
              </label>
              <label>
                Risk
                <select value={form.risk_level} onChange={(event) => updateForm("risk_level", event.target.value)}>
                  {["low", "medium", "high", "critical"].map((risk) => (
                    <option key={risk} value={risk}>
                      {titleCase(risk)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Required module
                <input value={form.required_module} onChange={(event) => updateForm("required_module", event.target.value)} placeholder="Payroll module" />
              </label>
              <label>
                Required plan
                <input value={form.required_plan} onChange={(event) => updateForm("required_plan", event.target.value)} placeholder="enterprise" />
              </label>
              <label className="tenant-modal__note">
                Description
                <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} rows={3} />
              </label>
              <label className="tenant-modal__check">
                <input checked={form.tenant_assignable} onChange={(event) => updateForm("tenant_assignable", event.target.checked)} type="checkbox" />
                Tenant admins can assign this permission to roles
              </label>
              <label className="tenant-modal__check">
                <input checked={form.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} type="checkbox" />
                Active in Platform Admin catalog
              </label>
            </div>
            <div className="tenant-modal__validation" id="permission-dialog-validation" role={formError ? "alert" : "status"}>
              {formError || "Save updates the DB catalog row and leaves runtime enforcement unchanged."}
            </div>
            <div className="tenant-modal__actions">
              <button className="button button--secondary" onClick={closeDialog} type="button">
                Cancel
              </button>
              <button className="button button--primary" disabled={busy} onClick={savePermission} type="button">
                {busy ? "Saving..." : "Save permission"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
