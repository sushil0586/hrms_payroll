"use client";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";


import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AsyncActionButton } from "@/components/patterns/async-action-button";
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
  const labelRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<PlatformPermissionCatalogItem | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (editing) labelRef.current?.focus();
  }, [editing]);



  function openDialog(permission: PlatformPermissionCatalogItem) {
    setEditing(permission);
    setForm(buildFormState(permission));
    setFormError("");
    setFieldErrors({});
    setNotice("");
  }

  function closeDialog() {
    setEditing(null);
    setForm(null);
    setFormError("");
    setFieldErrors({});
    setBusy(false);
  }

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function savePermission() {
    if (!editing || !form) return;
    const nextFieldErrors: Record<string, string> = {};
    if (!form.label.trim()) {
      nextFieldErrors.label = "Permission label is required.";
    }
    if (!form.module.trim()) {
      nextFieldErrors.module = "Module is required.";
    }
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setFormError("Fix the highlighted permission fields before continuing.");
      return;
    }
    setFieldErrors({});
    setBusy(true);
    setFormError("");
    let response: Response;
    try {
      response = await fetch(`/api/platform/permission-catalog/${encodeURIComponent(editing.key)}`, {
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
    } catch {
      setBusy(false);
      setFormError("The response was interrupted. Check this permission after reconnecting before retrying; your entered metadata remains here.");
      return;
    }
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setFormError(apiErrorMessage(payload, "Permission could not be updated."));
      return;
    }
    setNotice(`${editing.key} updated.`);
    closeDialog();
    window.location.reload();
  }

  return (
    <>
      <button className="button button--secondary" onClick={(triggerEvent) => { focusActionTrigger(triggerEvent); openDialog(permission); }} type="button">
        Edit
      </button>
      {notice ? <span className="muted">{notice}</span> : null}

      {editing && form && typeof document !== "undefined" ? createPortal((
        <HrAdminActionModal
          closeHref="/platform-admin/permissions"
          labelledBy="workspace-permission-catalog-actions"
          title="Edit platform permission"
          onClose={closeDialog}
          busy={busy}
          className="tenant-modal"
          footer={
            <div className="tenant-modal__actions">
              <button className="button button--secondary" onClick={() => window.dispatchEvent(new Event("hr-admin-modal:request-close"))} type="button">
                Cancel
              </button>
              <AsyncActionButton
                className="button button--primary"
                onClick={savePermission}
                pending={busy}
                pendingLabel="Saving permission"
                type="button"
              >
                Save permission
              </AsyncActionButton>
            </div>
          }
        >



<div className="tenant-modal__member-summary">
              <span className="muted">Key</span>
              <strong>{editing.key}</strong>
              <span className="muted">Keys are immutable. Runtime enforcement still uses the deployed permission key contract.</span>
            </div>

<div className="tenant-membership-form-grid tenant-membership-form-grid--dialog">
              <label>
                Label
                <input
                  aria-invalid={Boolean(fieldErrors.label)}
                  ref={labelRef}
                  value={form.label}
                  onChange={(event) => {
                    updateForm("label", event.target.value);
                    setFieldErrors((current) => {
                      const { label: _removed, ...rest } = current;
                      void _removed;
                      return rest;
                    });
                  }}
                />
                {fieldErrors.label ? <span className="field-error-text" role="alert">{fieldErrors.label}</span> : null}
              </label>
              <label>
                Module
                <input
                  aria-invalid={Boolean(fieldErrors.module)}
                  list="permission-module-options"
                  value={form.module}
                  onChange={(event) => {
                    updateForm("module", event.target.value);
                    setFieldErrors((current) => {
                      const { module: _removed, ...rest } = current;
                      void _removed;
                      return rest;
                    });
                  }}
                />
                <datalist id="permission-module-options">
                  {moduleOptions.map((module) => (
                    <option key={module} value={module} />
                  ))}
                </datalist>
                {fieldErrors.module ? <span className="field-error-text" role="alert">{fieldErrors.module}</span> : null}
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
              {formError || "Save updates catalog metadata. The immutable key and deployed runtime enforcement contract remain unchanged."}
            </div>

</HrAdminActionModal>
      ), document.body) : null}
    </>
  );
}
