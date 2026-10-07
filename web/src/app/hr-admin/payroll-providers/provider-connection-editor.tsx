"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { FieldErrors } from "@/lib/ui/validation";
import type { HrAdminEnumOption, HrAdminPayrollProviderConnection } from "@/lib/types";

type Props = {
  connection: HrAdminPayrollProviderConnection;
  providerKinds: HrAdminEnumOption[];
  connectionStatuses: HrAdminEnumOption[];
};

type FormValue = {
  provider_ref: string;
  provider_name: string;
  provider_kind: string;
  environment_ref: string;
  status: string;
  adapter_ref: string;
  sandbox_adapter_ref: string;
  channel_ref: string;
  credential_ref: string;
  credential_profile_ref: string;
  credential_required: boolean;
  callback_profile_ref: string;
  callback_verification_ref: string;
  retry_policy_ref: string;
  certification_profile_ref: string;
  real_provider_route: boolean;
  live_delivery_enabled: boolean;
  requires_real_credentials: boolean;
  config_snapshot: string;
};
type ProviderConnectionField =
  | "provider_name"
  | "provider_ref"
  | "environment_ref"
  | "status"
  | "adapter_ref"
  | "channel_ref"
  | "credential_ref"
  | "credential_profile_ref"
  | "callback_profile_ref"
  | "callback_verification_ref"
  | "retry_policy_ref"
  | "certification_profile_ref"
  | "real_provider_route"
  | "config_snapshot";

function configRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function prettyJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

function errorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string" && record.detail) {
    return record.detail;
  }
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value) && value.length) {
      return `${key}: ${String(value[0])}`;
    }
    if (typeof value === "string") {
      return `${key}: ${value}`;
    }
  }
  return fallback;
}

function initialValue(connection: HrAdminPayrollProviderConnection): FormValue {
  const config = configRecord(connection.config_snapshot);
  return {
    provider_ref: connection.provider_ref,
    provider_name: connection.provider_name,
    provider_kind: connection.provider_kind,
    environment_ref: connection.environment_ref,
    status: connection.status,
    adapter_ref: connection.adapter_ref,
    sandbox_adapter_ref: connection.sandbox_adapter_ref,
    channel_ref: connection.channel_ref,
    credential_ref: connection.credential_ref,
    credential_profile_ref: connection.credential_profile_ref,
    credential_required: connection.credential_required,
    callback_profile_ref: connection.callback_profile_ref,
    callback_verification_ref: connection.callback_verification_ref,
    retry_policy_ref: connection.retry_policy_ref,
    certification_profile_ref: connection.certification_profile_ref,
    real_provider_route: config.placeholder !== true && !connection.provider_ref.includes("placeholder"),
    live_delivery_enabled: config.live_delivery_enabled !== false,
    requires_real_credentials: Boolean(config.requires_real_credentials ?? connection.credential_required),
    config_snapshot: prettyJson(config),
  };
}

function adapterConfigKey(providerKind: string) {
  if (providerKind === "bank") {
    return "bank_payout_adapter";
  }
  if (providerKind === "accounting") {
    return "accounting_journal_adapter";
  }
  if (providerKind === "statutory") {
    return "statutory_filing_adapter";
  }
  return "";
}

function mergeProviderRoute(config: Record<string, unknown>, form: FormValue) {
  const currentRoute = configRecord(config.provider_route);
  const currentAdapterContract = configRecord(currentRoute.adapter_contract);
  const route: Record<string, unknown> = {
    ...currentRoute,
    provider_ref: form.provider_ref.trim(),
    provider_kind: form.provider_kind,
    adapter_ref: form.adapter_ref.trim(),
    channel_ref: form.channel_ref.trim(),
    credential_ref: form.credential_ref.trim(),
    credential_required: form.credential_required,
    credential_profile_ref: form.credential_profile_ref.trim(),
    callback_profile_ref: form.callback_profile_ref.trim(),
    callback_verification_ref: form.callback_verification_ref.trim(),
    retry_policy_ref: form.retry_policy_ref.trim(),
    certification_profile_ref: form.certification_profile_ref.trim(),
    adapter_contract: {
      ...currentAdapterContract,
      expected_adapter_ref: form.adapter_ref.trim(),
      expected_provider_ref: form.provider_ref.trim(),
    },
  };
  const key = adapterConfigKey(form.provider_kind);
  if (key) {
    route[key] = {
      ...configRecord(currentRoute[key]),
      credential_ref: form.credential_ref.trim(),
      credential_profile_ref: form.credential_profile_ref.trim(),
    };
  }
  return route;
}

function validateProviderConnection(form: FormValue) {
  const fieldErrors: FieldErrors<ProviderConnectionField> = {};
  const requiredFields: Array<[ProviderConnectionField, keyof FormValue, string]> = [
    ["provider_name", "provider_name", "Provider name is required before this provider setup can be saved."],
    ["provider_ref", "provider_ref", "Provider ref is required before this provider setup can be saved."],
    ["environment_ref", "environment_ref", "Environment is required before this provider setup can be saved."],
    ["status", "status", "Status is required before this provider setup can be saved."],
  ];
  const runtimeFields: Array<[ProviderConnectionField, keyof FormValue, string]> = [
    ["adapter_ref", "adapter_ref", "Adapter ref is required for a real or live provider route."],
    ["channel_ref", "channel_ref", "Channel ref is required for a real or live provider route."],
    ["callback_profile_ref", "callback_profile_ref", "Callback profile is required for a real or live provider route."],
    ["callback_verification_ref", "callback_verification_ref", "Callback verification is required for a real or live provider route."],
    ["retry_policy_ref", "retry_policy_ref", "Retry policy is required for a real or live provider route."],
    ["certification_profile_ref", "certification_profile_ref", "Certification profile is required for a real or live provider route."],
  ];
  const credentialFields: Array<[ProviderConnectionField, keyof FormValue, string]> = [
    ["credential_ref", "credential_ref", "Credential ref is required when credentials are required."],
    ["credential_profile_ref", "credential_profile_ref", "Credential profile is required when credentials are required."],
  ];

  requiredFields.forEach(([errorField, formField, message]) => {
    if (!String(form[formField] ?? "").trim()) {
      fieldErrors[errorField] = message;
    }
  });

  if (form.real_provider_route || form.live_delivery_enabled) {
    runtimeFields.forEach(([errorField, formField, message]) => {
      if (!String(form[formField] ?? "").trim()) {
        fieldErrors[errorField] = message;
      }
    });
  }

  if (form.credential_required || form.requires_real_credentials) {
    credentialFields.forEach(([errorField, formField, message]) => {
      if (!String(form[formField] ?? "").trim()) {
        fieldErrors[errorField] = message;
      }
    });
  }

  if (form.live_delivery_enabled && !form.real_provider_route) {
    fieldErrors.real_provider_route = "Live delivery requires a real provider route.";
  }

  return fieldErrors;
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="field-error-text" role="alert">{message}</span> : null;
}

function useEscapeClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}

export function ProviderConnectionEditor({ connection, providerKinds, connectionStatuses }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [formValue, setFormValue] = useState(() => initialValue(connection));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ProviderConnectionField>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  useEscapeClose(isOpen, () => {
    if (!isSaving) {
      setIsOpen(false);
    }
  });
  const modalTitleId = useMemo(() => `provider-connection-editor-${connection.id}`, [connection.id]);

  function update<Key extends keyof FormValue>(key: Key, value: FormValue[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function openEditor() {
    setFormValue(initialValue(connection));
    setFieldErrors({});
    setNotice("");
    setIsOpen(true);
  }

  async function save() {
    setIsSaving(true);
    setNotice("");
    const nextFieldErrors = validateProviderConnection(formValue);
    let config: Record<string, unknown>;
    try {
      config = configRecord(JSON.parse(formValue.config_snapshot || "{}"));
    } catch {
      nextFieldErrors.config_snapshot = "Config JSON is invalid.";
      config = {};
    }
    if (Object.keys(nextFieldErrors).length) {
      setIsSaving(false);
      setFieldErrors(nextFieldErrors);
      setNotice("Fix the highlighted provider fields before saving.");
      return;
    }
    setFieldErrors({});

    const configSnapshot: Record<string, unknown> = {
      ...config,
      placeholder: formValue.real_provider_route ? false : config.placeholder,
      live_delivery_enabled: formValue.live_delivery_enabled,
      requires_real_credentials: formValue.requires_real_credentials,
      provider_route: mergeProviderRoute(config, formValue),
      updated_from: "hr_admin.payroll_provider_connection_editor.v1",
    };

    const payload = {
      provider_ref: formValue.provider_ref.trim(),
      provider_name: formValue.provider_name.trim(),
      provider_kind: formValue.provider_kind,
      environment_ref: formValue.environment_ref.trim(),
      status: formValue.status,
      adapter_ref: formValue.adapter_ref.trim(),
      sandbox_adapter_ref: formValue.sandbox_adapter_ref.trim(),
      channel_ref: formValue.channel_ref.trim(),
      credential_ref: formValue.credential_ref.trim(),
      credential_profile_ref: formValue.credential_profile_ref.trim(),
      credential_required: formValue.credential_required,
      callback_profile_ref: formValue.callback_profile_ref.trim(),
      callback_verification_ref: formValue.callback_verification_ref.trim(),
      retry_policy_ref: formValue.retry_policy_ref.trim(),
      certification_profile_ref: formValue.certification_profile_ref.trim(),
      config_snapshot: configSnapshot,
    };

    const response = await fetch(`/api/hr-admin/payroll-provider-connections/${connection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setNotice(errorMessage(result, "Provider connection could not be saved."));
      return;
    }
    setNotice(errorMessage(result, "Provider connection saved."));
    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="button button--primary" type="button" onClick={openEditor}>
        Configure provider
      </button>
      {isOpen ? (
        <div className="modal-shell provider-connection-modal-shell" role="presentation">
          <section
            aria-modal="true"
            aria-labelledby={modalTitleId}
            className="modal provider-connection-modal"
            role="dialog"
          >
            <div className="modal__header">
              <div>
                <span className="workspace-card__eyebrow">Provider setup</span>
                <h2 id={modalTitleId}>Configure provider connection</h2>
                <p>Use secret references and provider refs only. Do not paste raw API keys, passwords, or certificates here.</p>
              </div>
              <button className="button button--ghost" type="button" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>

            <div className="provider-connection-form-grid">
              <label className="form-field">
                <span>Provider name</span>
                <input aria-invalid={Boolean(fieldErrors.provider_name)} className="input-control" value={formValue.provider_name} onChange={(event) => update("provider_name", event.target.value)} />
                <FieldError message={fieldErrors.provider_name} />
              </label>
              <label className="form-field">
                <span>Provider ref</span>
                <input aria-invalid={Boolean(fieldErrors.provider_ref)} className="input-control" value={formValue.provider_ref} onChange={(event) => update("provider_ref", event.target.value)} />
                <FieldError message={fieldErrors.provider_ref} />
              </label>
              <label className="form-field">
                <span>Provider kind</span>
                <select className="input-control" value={formValue.provider_kind} onChange={(event) => update("provider_kind", event.target.value)}>
                  {providerKinds.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Environment</span>
                <input aria-invalid={Boolean(fieldErrors.environment_ref)} className="input-control" value={formValue.environment_ref} onChange={(event) => update("environment_ref", event.target.value)} placeholder="sandbox / staging / production" />
                <FieldError message={fieldErrors.environment_ref} />
              </label>
              <label className="form-field">
                <span>Status</span>
                <select aria-invalid={Boolean(fieldErrors.status)} className="input-control" value={formValue.status} onChange={(event) => update("status", event.target.value)}>
                  {connectionStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <FieldError message={fieldErrors.status} />
              </label>
              <label className="form-field">
                <span>Adapter ref</span>
                <input aria-invalid={Boolean(fieldErrors.adapter_ref)} className="input-control" value={formValue.adapter_ref} onChange={(event) => update("adapter_ref", event.target.value)} />
                <FieldError message={fieldErrors.adapter_ref} />
              </label>
              <label className="form-field">
                <span>Sandbox adapter ref</span>
                <input className="input-control" value={formValue.sandbox_adapter_ref} onChange={(event) => update("sandbox_adapter_ref", event.target.value)} />
              </label>
              <label className="form-field">
                <span>Channel ref</span>
                <input aria-invalid={Boolean(fieldErrors.channel_ref)} className="input-control" value={formValue.channel_ref} onChange={(event) => update("channel_ref", event.target.value)} />
                <FieldError message={fieldErrors.channel_ref} />
              </label>
              <label className="form-field">
                <span>Credential ref</span>
                <input aria-invalid={Boolean(fieldErrors.credential_ref)} className="input-control" value={formValue.credential_ref} onChange={(event) => update("credential_ref", event.target.value)} placeholder="secret-manager://..." />
                <FieldError message={fieldErrors.credential_ref} />
              </label>
              <label className="form-field">
                <span>Credential profile</span>
                <input aria-invalid={Boolean(fieldErrors.credential_profile_ref)} className="input-control" value={formValue.credential_profile_ref} onChange={(event) => update("credential_profile_ref", event.target.value)} />
                <FieldError message={fieldErrors.credential_profile_ref} />
              </label>
              <label className="form-field">
                <span>Callback profile</span>
                <input aria-invalid={Boolean(fieldErrors.callback_profile_ref)} className="input-control" value={formValue.callback_profile_ref} onChange={(event) => update("callback_profile_ref", event.target.value)} />
                <FieldError message={fieldErrors.callback_profile_ref} />
              </label>
              <label className="form-field">
                <span>Callback verification</span>
                <input aria-invalid={Boolean(fieldErrors.callback_verification_ref)} className="input-control" value={formValue.callback_verification_ref} onChange={(event) => update("callback_verification_ref", event.target.value)} />
                <FieldError message={fieldErrors.callback_verification_ref} />
              </label>
              <label className="form-field">
                <span>Retry policy</span>
                <input aria-invalid={Boolean(fieldErrors.retry_policy_ref)} className="input-control" value={formValue.retry_policy_ref} onChange={(event) => update("retry_policy_ref", event.target.value)} />
                <FieldError message={fieldErrors.retry_policy_ref} />
              </label>
              <label className="form-field">
                <span>Certification profile</span>
                <input aria-invalid={Boolean(fieldErrors.certification_profile_ref)} className="input-control" value={formValue.certification_profile_ref} onChange={(event) => update("certification_profile_ref", event.target.value)} />
                <FieldError message={fieldErrors.certification_profile_ref} />
              </label>
              <label className="toggle-inline">
                <input type="checkbox" checked={formValue.credential_required} onChange={(event) => update("credential_required", event.target.checked)} />
                Credential required
              </label>
              <label className="toggle-inline">
                <input type="checkbox" checked={formValue.real_provider_route} onChange={(event) => update("real_provider_route", event.target.checked)} />
                Real provider route
                <FieldError message={fieldErrors.real_provider_route} />
              </label>
              <label className="toggle-inline">
                <input type="checkbox" checked={formValue.live_delivery_enabled} onChange={(event) => update("live_delivery_enabled", event.target.checked)} />
                Live delivery enabled
              </label>
              <label className="toggle-inline">
                <input type="checkbox" checked={formValue.requires_real_credentials} onChange={(event) => update("requires_real_credentials", event.target.checked)} />
                Requires real credential reference
              </label>
              <label className="form-field form-field--full">
                <span>Advanced config JSON</span>
                <textarea aria-invalid={Boolean(fieldErrors.config_snapshot)} className="input-control provider-connection-config-textarea" rows={10} value={formValue.config_snapshot} onChange={(event) => update("config_snapshot", event.target.value)} />
                <FieldError message={fieldErrors.config_snapshot} />
              </label>
            </div>

            <div className="provider-connection-modal-footer">
              <div>
                <strong>{connection.provider_name}</strong>
                <span role={notice ? "alert" : undefined}>{notice || "Saving recomputes provider readiness immediately."}</span>
              </div>
              <button className="button button--secondary" type="button" onClick={() => setIsOpen(false)} disabled={isSaving}>
                Cancel
              </button>
              <button className="button button--primary" type="button" onClick={save} disabled={isSaving}>
                {isSaving ? "Saving" : "Save provider"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
