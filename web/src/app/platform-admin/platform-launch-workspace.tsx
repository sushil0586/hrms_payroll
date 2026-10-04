"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type {
  PlatformLaunchBlueprint,
  PlatformLaunchInputDefinition,
  PlatformLaunchModule,
  PlatformTenantLaunchPreview,
  PlatformTenantLaunchPreviewResponse,
  PlatformTenantLaunchRun,
  PlatformTenantListItem,
  PlatformTenantOnboarding,
} from "@/lib/types";

type Props = {
  selectedTenant: PlatformTenantListItem | null;
  onboarding: PlatformTenantOnboarding | null;
};

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function apiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  if (payload && typeof payload === "object") {
    for (const value of Object.values(payload as Record<string, unknown>)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return fallback;
}

function defaultInputValue(key: string, selectedTenant: PlatformTenantListItem | null, onboarding: PlatformTenantOnboarding | null) {
  const primaryContact = onboarding?.admin_contacts.find((contact) => contact.is_primary) ?? onboarding?.admin_contacts[0] ?? null;
  const defaults: Record<string, string> = {
    legal_name: selectedTenant?.legal_name || selectedTenant?.name || "",
    primary_contact: selectedTenant?.primary_email || primaryContact?.email || "",
    tenant_admin_contact: primaryContact?.email || selectedTenant?.primary_email || "",
    legal_entity: selectedTenant?.legal_name || selectedTenant?.name || "",
    default_branch: "",
    default_department: "Operations",
    work_week: "mon_fri",
    holiday_region: "KA",
    pay_frequency: "monthly",
    salary_structure_style: "simple_ctc",
    financial_year: "2026-2027",
    provider_strategy: "none",
    statutory_registration_strategy: "collect_before_launch",
    weekly_off_policy: "fixed",
  };
  return defaults[key] ?? "";
}

function groupedInputs(schema: PlatformLaunchInputDefinition[]) {
  return schema.reduce<Record<string, PlatformLaunchInputDefinition[]>>((groups, field) => {
    groups[field.group] = [...(groups[field.group] ?? []), field];
    return groups;
  }, {});
}

function compactInputPayload(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value.length > 0),
  );
}

function launchModuleExplanation(module: PlatformLaunchModule) {
  if (module.ref === "payroll_defaults") {
    if (module.plan_allowed === false) return "Available from Growth. No payroll setup will be created for this tenant plan.";
    if (module.missing_inputs?.length) return "Needs payroll cycle, salary structure style, and financial year before configuration can be prepared.";
    return "Creates payroll configuration only: calendar, pay group, salary components, salary structure, and draft statutory references. No payroll runs or employee salary assignments are created.";
  }
  if (module.ref === "provider_placeholders") {
    if (module.plan_allowed === false) return "Available from Growth. Provider lanes stay outside this tenant plan.";
    if (module.missing_inputs?.length) return "Needs provider strategy before blocked bank, accounting, and statutory lanes can be prepared.";
    return "Creates blocked provider lanes and draft mapping packs only. Real credentials, certification, activation, provider jobs, and live submissions remain off.";
  }
  if (module.ref === "workflows") {
    return "Creates reusable approval templates and assignments. It does not start runtime approval requests.";
  }
  if (module.ref === "documents") {
    return "Creates document categories and requirement rules. It does not create employee documents or uploaded artifacts.";
  }
  if (module.ref === "leave_attendance") {
    return "Creates default leave, holiday, shift, and attendance policy records. It does not create employee attendance or leave balances.";
  }
  return module.action_needed || module.skip_reason || "Ready for review.";
}

function launchModuleChip(module: PlatformLaunchModule) {
  if (module.ref === "provider_placeholders" && module.apply_allowed) return "Safe but blocked";
  if (module.ref === "payroll_defaults" && module.apply_allowed) return "Configuration only";
  if (module.apply_allowed) return "Apply allowed";
  if (module.safe_apply_enabled) return "Safe seeder";
  return "";
}

function previewModuleByRef(preview: PlatformTenantLaunchPreview | null, ref: string) {
  if (!preview) return null;
  return [...preview.planned_modules, ...preview.skipped_modules].find((module) => module.ref === ref) ?? null;
}

function postureForModule(module: PlatformLaunchModule | null, fallbackTitle: string) {
  if (!module) {
    return {
      title: fallbackTitle,
      chip: "Not in template",
      tone: "neutral",
      summary: "This blueprint does not include this setup lane.",
    };
  }
  if (module.plan_allowed === false) {
    return {
      title: module.title || module.label,
      chip: `${titleCase(module.minimum_plan)}+`,
      tone: "warning",
      summary: launchModuleExplanation(module),
    };
  }
  if (module.missing_inputs?.length) {
    return {
      title: module.title || module.label,
      chip: `${module.missing_inputs.length} input${module.missing_inputs.length === 1 ? "" : "s"} needed`,
      tone: "warning",
      summary: launchModuleExplanation(module),
    };
  }
  if (module.ref === "provider_placeholders" && module.apply_allowed) {
    return {
      title: module.title || module.label,
      chip: "Blocked after apply",
      tone: "warning",
      summary: launchModuleExplanation(module),
    };
  }
  if (module.apply_allowed) {
    return {
      title: module.title || module.label,
      chip: module.ref === "payroll_defaults" ? "Setup only" : "Ready",
      tone: "success",
      summary: launchModuleExplanation(module),
    };
  }
  return {
    title: module.title || module.label,
    chip: module.status_label || "Gated",
    tone: "warning",
    summary: launchModuleExplanation(module),
  };
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function seededResult(item: PlatformTenantLaunchRun["seeded_items"][number] | undefined) {
  const result = item?.payload?.result;
  return result && typeof result === "object" ? result as { created?: unknown; existing?: unknown; skipped?: unknown; message?: unknown } : null;
}

function countRefs(refs: string[], prefix: string) {
  return refs.filter((ref) => ref.startsWith(prefix)).length;
}

function launchEvidenceCards(run: PlatformTenantLaunchRun) {
  if (run.run_type !== "apply" || run.status !== "succeeded") return [];
  const cards: Array<{ title: string; chip: string; tone: "success" | "warning"; lines: string[] }> = [];
  const itemByModule = new Map(run.seeded_items.map((item) => [item.module_ref || item.item_key, item]));
  const payrollResult = seededResult(itemByModule.get("payroll_defaults"));
  if (payrollResult) {
    const refs = [...stringList(payrollResult.created), ...stringList(payrollResult.existing)];
    cards.push({
      title: "Payroll defaults evidence",
      chip: "Configuration only",
      tone: "success",
      lines: [
        `${countRefs(refs, "salary_component:")} salary components, ${countRefs(refs, "salary_structure_component:")} structure lines`,
        `${countRefs(refs, "payroll_calendar:")} calendar, ${countRefs(refs, "pay_group:")} pay group, ${countRefs(refs, "statutory_pack:")} statutory pack`,
        "No payroll runs, employee pay group assignments, or salary assignments created.",
      ],
    });
  }
  const providerResult = seededResult(itemByModule.get("provider_placeholders"));
  if (providerResult) {
    const refs = [...stringList(providerResult.created), ...stringList(providerResult.existing)];
    cards.push({
      title: "Provider placeholders evidence",
      chip: "Blocked",
      tone: "warning",
      lines: [
        `${countRefs(refs, "provider_connection:")} blocked provider lanes`,
        `${countRefs(refs, "provider_mapping_pack:")} draft mapping packs`,
        "No real credentials, certification runs, provider jobs, deliveries, or live submissions created.",
      ],
    });
  }
  return cards;
}

function ModuleList({ emptyText, modules }: { emptyText: string; modules: PlatformLaunchModule[] }) {
  if (!modules.length) {
    return (
      <div className="notice notice--compact">
        <strong>{emptyText}</strong>
      </div>
    );
  }
  return (
    <div className="tenant-support-access-list">
      {modules.map((module) => (
        <div className="tenant-support-access-row tenant-support-access-row--stacked" key={module.ref}>
          <div>
            <strong>{module.title || module.label}</strong>
            <span>{module.description}</span>
            <span>{launchModuleExplanation(module)}</span>
          </div>
          <span className="record-chip">{module.status_label || titleCase(module.ui_status || "planned")}</span>
          <span className="record-chip">{module.editability_label || titleCase(module.ownership_mode)}</span>
          <span className={`record-chip ${module.plan_allowed === false ? "record-chip--warning" : "record-chip--success"}`}>
            {module.plan_allowed === false ? `${titleCase(module.minimum_plan)} plan` : `${titleCase(module.tenant_plan || module.minimum_plan)} allowed`}
          </span>
          {launchModuleChip(module) ? (
            <span className={`record-chip ${module.ref === "provider_placeholders" ? "record-chip--warning" : "record-chip--success"}`}>{launchModuleChip(module)}</span>
          ) : module.safe_apply_enabled ? (
            <span className="record-chip">Safe seeder</span>
          ) : null}
          {module.missing_inputs?.length ? (
            <span className="record-chip">{module.missing_inputs.length} missing</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function InputField({
  field,
  onChange,
  value,
}: {
  field: PlatformLaunchInputDefinition;
  onChange: (key: string, value: string) => void;
  value: string;
}) {
  if (field.field_type === "select") {
    return (
      <label className="form-field">
        <span className="muted">{field.label}</span>
        <select className="input-control" name={field.key} onChange={(event) => onChange(field.key, event.target.value)} required={field.required} value={value}>
          <option value="">Select</option>
          {field.choices.map((choice) => (
            <option key={choice.value} value={choice.value}>{choice.label}</option>
          ))}
        </select>
        <span className="platform-validation-note">{field.help_text}</span>
      </label>
    );
  }
  if (field.field_type === "multiline_text") {
    return (
      <label className="form-field platform-form-field--tall">
        <span className="muted">{field.label}</span>
        <textarea
          className="input-control"
          name={field.key}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          value={value}
        />
        <span className="platform-validation-note">{field.help_text}</span>
      </label>
    );
  }
  return (
    <label className="form-field">
      <span className="muted">{field.label}</span>
      <input
        className="input-control"
        name={field.key}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder || field.example}
        required={field.required}
        type={field.field_type === "email" ? "email" : "text"}
        value={value}
      />
      <span className="platform-validation-note">{field.help_text}</span>
    </label>
  );
}

export function PlatformLaunchWorkspace({ onboarding, selectedTenant }: Props) {
  const [blueprints, setBlueprints] = useState<PlatformLaunchBlueprint[]>([]);
  const [launchRuns, setLaunchRuns] = useState<PlatformTenantLaunchRun[]>([]);
  const [selectedBlueprintRef, setSelectedBlueprintRef] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [changeReason, setChangeReason] = useState("");
  const [handoffNotes, setHandoffNotes] = useState(onboarding?.customer_handoff_notes ?? "");
  const [handoffOnboarding, setHandoffOnboarding] = useState<PlatformTenantOnboarding | null>(null);
  const [preview, setPreview] = useState<PlatformTenantLaunchPreview | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedBlueprint = blueprints.find((blueprint) => blueprint.ref === selectedBlueprintRef) ?? blueprints[0] ?? null;
  const inputGroups = useMemo(() => groupedInputs(selectedBlueprint?.input_schema ?? []), [selectedBlueprint]);
  const resolvedInputValues = useMemo(() => {
    if (!selectedBlueprint) return inputValues;
    const next = { ...inputValues };
    selectedBlueprint.input_schema.forEach((field) => {
      if (next[field.key] === undefined) {
        next[field.key] = defaultInputValue(field.key, selectedTenant, onboarding);
      }
    });
    return next;
  }, [inputValues, onboarding, selectedBlueprint, selectedTenant]);
  const latestApplyRun = launchRuns.find((run) => run.run_type === "apply");
  const initialHandoffNotes = onboarding?.customer_handoff_notes ?? "";

  useEffect(() => {
    const tenant = selectedTenant;
    if (!tenant) return;
    const tenantCountryCode = tenant.country_code;
    const tenantId = tenant.id;
    const tenantSubscriptionPlan = tenant.subscription_plan;
    let cancelled = false;
    async function loadLaunchData() {
      setError("");
      const [blueprintResponse, runsResponse] = await Promise.all([
        fetch(`/api/platform/launch-blueprints?country_code=${encodeURIComponent(tenantCountryCode)}&subscription_plan=${encodeURIComponent(tenantSubscriptionPlan)}`),
        fetch(`/api/platform/tenants/${tenantId}/launch-runs`),
      ]);
      const blueprintPayload = await blueprintResponse.json().catch(() => []);
      const runsPayload = await runsResponse.json().catch(() => []);
      if (cancelled) return;
      if (!blueprintResponse.ok) {
        setError(apiMessage(blueprintPayload, "Launch blueprints could not be loaded."));
      } else {
        setBlueprints(blueprintPayload as PlatformLaunchBlueprint[]);
        const preferred = (blueprintPayload as PlatformLaunchBlueprint[]).find((item) => item.compatibility?.plan_allowed && item.compatibility?.country_matches);
        setSelectedBlueprintRef(preferred?.ref || (blueprintPayload as PlatformLaunchBlueprint[])[0]?.ref || "");
        setInputValues({});
        setChangeReason("");
        setHandoffNotes(initialHandoffNotes);
        setHandoffOnboarding(null);
        setPreview(null);
      }
      if (!runsResponse.ok) {
        setError(apiMessage(runsPayload, "Launch run evidence could not be loaded."));
      } else {
        setLaunchRuns(runsPayload as PlatformTenantLaunchRun[]);
      }
    }
    void loadLaunchData();
    return () => {
      cancelled = true;
    };
  }, [initialHandoffNotes, selectedTenant]);

  async function refreshRuns() {
    if (!selectedTenant) return;
    const runsResponse = await fetch(`/api/platform/tenants/${selectedTenant.id}/launch-runs`);
    if (runsResponse.ok) {
      setLaunchRuns((await runsResponse.json()) as PlatformTenantLaunchRun[]);
    }
  }

  async function handlePreview() {
    if (!selectedTenant || !selectedBlueprint) return;
    setBusy("preview");
    setError("");
    setMessage("");
    const response = await fetch(`/api/platform/tenants/${selectedTenant.id}/launch-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blueprint_ref: selectedBlueprint.ref,
        blueprint_version: selectedBlueprint.version,
        input_payload: compactInputPayload(resolvedInputValues),
        change_reason: changeReason.trim(),
        idempotency_key: `ui-preview-${selectedTenant.id}-${selectedBlueprint.ref}`,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy("");
    if (!response.ok) {
      setError(apiMessage(payload, "Launch preview failed."));
      return;
    }
    const result = payload as PlatformTenantLaunchPreviewResponse;
    setPreview(result.preview);
    setMessage("Launch preview completed.");
    await refreshRuns();
  }

  async function handleSafeApply() {
    if (!selectedTenant || !preview?.can_apply) return;
    setBusy("apply");
    setError("");
    setMessage("");
    const response = await fetch(`/api/platform/tenants/${selectedTenant.id}/launch-apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotency_key: `ui-apply-safe-${selectedTenant.id}-${preview.blueprint_ref}-${preview.blueprint_version}` }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy("");
    if (!response.ok) {
      setError(apiMessage(payload, "Safe launch apply failed."));
      return;
    }
    setMessage("Certified safe launch setup applied.");
    await refreshRuns();
  }

  async function handleCustomerHandoff() {
    if (!selectedTenant) return;
    setBusy("handoff");
    setError("");
    setMessage("");
    const response = await fetch(`/api/platform/tenants/${selectedTenant.id}/launch-handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff_notes: handoffNotes }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy("");
    if (!response.ok) {
      setError(apiMessage(payload, "Customer handoff failed."));
      return;
    }
    setHandoffOnboarding(payload as PlatformTenantOnboarding);
    setMessage("Customer handoff completed.");
    await refreshRuns();
  }

  if (!selectedTenant || !onboarding) {
    return (
      <section className="section">
        <article className="record-card">
          <div className="notice">
            <strong>Select a tenant to configure launch blueprint onboarding.</strong>
            <span className="muted">Open a tenant from the Tenants panel, then return to Launch Blueprint.</span>
          </div>
        </article>
      </section>
    );
  }

  const currentPreview = preview;
  const effectiveOnboarding = handoffOnboarding ?? onboarding;
  const readySafeModules = currentPreview?.planned_modules.filter((module) => module.apply_allowed === true) ?? [];
  const needsInputModules = currentPreview?.planned_modules.filter((module) => module.missing_inputs?.length) ?? [];
  const gatedModules = currentPreview?.planned_modules.filter((module) => !module.missing_inputs?.length && module.apply_allowed !== true) ?? [];
  const skippedModules = currentPreview?.skipped_modules ?? [];
  const payrollDefaultsPosture = postureForModule(previewModuleByRef(currentPreview, "payroll_defaults"), "Payroll defaults");
  const providerPosture = postureForModule(previewModuleByRef(currentPreview, "provider_placeholders"), "Provider placeholders");
  const canApplySafeModules = Boolean(currentPreview?.can_apply && currentPreview.safe_apply_modules.length);
  const hasSafeApplyEvidence = Boolean(effectiveOnboarding.launch_applied_at || latestApplyRun);
  const handoffCompleted = Boolean(effectiveOnboarding.handoff_completed_at);
  const selectedBlueprintChangedAfterApply = Boolean(
    hasSafeApplyEvidence
      && effectiveOnboarding.launch_blueprint_ref
      && selectedBlueprint
      && selectedBlueprint.ref !== effectiveOnboarding.launch_blueprint_ref,
  );

  return (
    <>
      {(message || error) ? (
        <section className="section">
          <div className={`notice platform-feedback${error ? " platform-feedback--error" : " platform-feedback--success"}`} role={error ? "alert" : "status"}>
            <strong>{error || message}</strong>
          </div>
        </section>
      ) : null}

      <section className="section support-session-grid" data-testid="platform-launch-blueprint-panel">
        <article className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title">
              <h2>Blueprint selection</h2>
              <span className="record-chip">{blueprints.length} templates</span>
            </div>
            <p className="section-copy">Choose the customer setup style, then preview before any safe setup is applied.</p>
          </div>
          <div className="tenant-support-access-list">
            {blueprints.map((blueprint) => {
              const selected = blueprint.ref === selectedBlueprintRef;
              return (
                <button
                  className={`tenant-support-access-row tenant-support-access-row--stacked platform-template-row${selected ? " employee-directory-item--active" : ""}`}
                  key={blueprint.ref}
                  onClick={() => {
                    setSelectedBlueprintRef(blueprint.ref);
                    setInputValues({});
                    setChangeReason("");
                    setPreview(null);
                  }}
                  type="button"
                >
                  <div className="platform-template-row__summary">
                    <strong>{blueprint.label}</strong>
                    <span>{blueprint.summary}</span>
                    <span>{titleCase(blueprint.workforce_model)} - {titleCase(blueprint.payroll_scope)}</span>
                  </div>
                  <span className="record-chip">{titleCase(blueprint.minimum_plan)}+</span>
                  <span className={`record-chip ${blueprint.compatibility?.plan_allowed ? "record-chip--success" : "record-chip--warning"}`}>
                    {blueprint.compatibility?.plan_allowed ? "Compatible" : "Plan gated"}
                  </span>
                  <span className="record-chip">{blueprint.compatibility?.included_module_count ?? blueprint.modules.length} included</span>
                  {blueprint.compatibility?.plan_gated_module_count ? (
                    <span className="record-chip record-chip--warning">{blueprint.compatibility.plan_gated_module_count} locked</span>
                  ) : null}
                  <span className="record-chip">{blueprint.compatibility?.safe_apply_module_count ?? 0} safe apply</span>
                </button>
              );
            })}
            {!blueprints.length ? (
              <div className="notice">
                <strong>No compatible launch blueprints found.</strong>
                <span className="muted">Check the tenant country and subscription plan, then retry.</span>
              </div>
            ) : null}
          </div>
        </article>

        <article className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title">
              <h2>Tenant launch status</h2>
              <span className="record-chip">{titleCase(effectiveOnboarding.launch_readiness_status || "not_configured")}</span>
            </div>
            <p className="section-copy">Selected tenant, current launch metadata, and safe-apply posture.</p>
          </div>
          <div className="detail-grid">
            <DetailRow label="Tenant" value={`${selectedTenant.name} (${selectedTenant.code})`} />
            <DetailRow label="Plan" value={titleCase(selectedTenant.subscription_plan)} />
            <DetailRow label="Blueprint" value={effectiveOnboarding.launch_blueprint_ref || "Not selected"} />
            <DetailRow label="Selected at" value={formatDateTime(effectiveOnboarding.launch_selected_at)} />
            <DetailRow label="Applied at" value={formatDateTime(effectiveOnboarding.launch_applied_at)} />
            <DetailRow label="Handoff at" value={formatDateTime(effectiveOnboarding.handoff_completed_at)} />
            <DetailRow label="Latest apply" value={latestApplyRun ? titleCase(latestApplyRun.status) : "Not applied"} />
          </div>
          {effectiveOnboarding.launch_status_notes ? (
            <div className="notice notice--compact">
              <strong>{effectiveOnboarding.launch_status_notes}</strong>
            </div>
          ) : null}
        </article>
      </section>

      {selectedBlueprint ? (
        <section className="section">
          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Required inputs</h2>
                <span className="record-chip">{selectedBlueprint.input_schema.length} fields</span>
              </div>
              <p className="section-copy">Fields are grouped for platform operators. Sensitive/provider values are only placeholders at this phase.</p>
            </div>
            <div className="platform-control-grid">
              {Object.entries(inputGroups).map(([group, fields]) => (
                <div className="platform-input-group" key={group}>
                  <div className="record-card__title">
                    <h3>{group}</h3>
                    <span className="record-chip">{fields.length}</span>
                  </div>
                  <div className="form-grid">
                    {fields.map((field) => (
                      <InputField
                        field={field}
                        key={field.key}
                        onChange={(key, value) => {
                          setInputValues((current) => ({ ...current, [key]: value }));
                          setPreview(null);
                        }}
                        value={resolvedInputValues[field.key] ?? ""}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {hasSafeApplyEvidence ? (
              <div className="notice notice--compact platform-validation-strip">
                <strong>{selectedBlueprintChangedAfterApply ? "Blueprint change requires review" : "Change control active"}</strong>
                <span className="muted">
                  Safe setup has already been applied. Add a reason before previewing changed blueprint choices or launch inputs.
                </span>
                <label className="form-field form-field--full">
                  <span className="muted">Change reason</span>
                  <textarea
                    className="input-control"
                    name="change_reason"
                    onChange={(event) => setChangeReason(event.target.value)}
                    placeholder="Example: Customer changed default branch before handoff."
                    value={changeReason}
                  />
                </label>
              </div>
            ) : null}
            <div className="form-actions-bar">
              <span className="muted">Preview shows what will configure, what needs input, and what remains gated.</span>
              <button className="button button--primary" disabled={Boolean(busy)} onClick={handlePreview} type="button">
                {busy === "preview" ? "Previewing..." : "Preview launch plan"}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {currentPreview ? (
        <section className="section support-session-grid">
          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Preview result</h2>
                <span className={`record-chip ${currentPreview.can_apply ? "record-chip--success" : "record-chip--warning"}`}>
                  {currentPreview.can_apply ? "Apply-ready" : "Needs inputs"}
                </span>
              </div>
              <p className="section-copy">This preview does not create HR, payroll, provider, organization, or employee data.</p>
            </div>
            <div className="detail-grid">
              <DetailRow label="Missing inputs" value={currentPreview.missing_inputs.length} />
              <DetailRow label="Warnings" value={currentPreview.warnings.length} />
              <DetailRow label="Safe apply modules" value={currentPreview.safe_apply_modules.length} />
              <DetailRow label="Certification gated" value={currentPreview.uncertified_modules.length} />
              <DetailRow label="Plan locked" value={currentPreview.plan_gated_modules.length} />
            </div>
            <div className="platform-launch-posture-grid" aria-label="Payroll and provider launch posture">
              <LaunchPostureCard posture={payrollDefaultsPosture} />
              <LaunchPostureCard posture={providerPosture} />
              <LaunchPostureCard
                posture={{
                  title: "Production payroll",
                  chip: "Not live",
                  tone: "warning",
                  summary: "Go-live still requires employee assignments, statutory registrations, real provider credentials, provider certification, payroll rehearsal, and finance handoff evidence.",
                }}
              />
            </div>
            {currentPreview.missing_inputs.length ? (
              <div className="notice notice--compact platform-validation-strip">
                <strong>Inputs needed</strong>
                <span className="muted">{currentPreview.missing_inputs.map(titleCase).join(", ")}</span>
              </div>
            ) : null}
            <div className="form-actions-bar">
              <span className="muted">Safe apply creates only modules allowed by the latest preview, subscription, and certified seeder list.</span>
              <button className="button button--primary" disabled={Boolean(busy) || !canApplySafeModules} onClick={handleSafeApply} type="button">
                {busy === "apply" ? "Applying..." : "Apply safe launch setup"}
              </button>
            </div>
          </article>

          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Will configure now</h2>
                <span className="record-chip">{readySafeModules.length}</span>
              </div>
            </div>
            <ModuleList emptyText="No safe modules are ready yet." modules={readySafeModules} />
          </article>

          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Needs input</h2>
                <span className="record-chip">{needsInputModules.length}</span>
              </div>
            </div>
            <ModuleList emptyText="No modules are waiting for input." modules={needsInputModules} />
          </article>

          <article className="record-card">
            <div className="record-card__title-wrap">
              <div className="record-card__title">
                <h2>Gated for later</h2>
                <span className="record-chip">{gatedModules.length + skippedModules.length}</span>
              </div>
            </div>
            <ModuleList emptyText="No gated modules in this preview." modules={[...gatedModules, ...skippedModules]} />
          </article>
        </section>
      ) : null}

      <section className="section">
        <article className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title">
              <h2>Customer handoff</h2>
              <span className={`record-chip ${handoffCompleted ? "record-chip--success" : "record-chip--warning"}`}>
                {handoffCompleted ? "Customer ready" : "Pending"}
              </span>
            </div>
            <p className="section-copy">Complete this when the customer admin has been briefed and customer-owned setup can continue.</p>
          </div>
          <div className="detail-grid">
            <DetailRow label="Safe setup" value={hasSafeApplyEvidence ? "Applied" : "Required before handoff"} />
            <DetailRow label="Handoff completed" value={formatDateTime(effectiveOnboarding.handoff_completed_at)} />
            <DetailRow label="Next owner" value={handoffCompleted ? "Tenant Admin / HR Admin" : "Platform Admin"} />
          </div>
          <label className="form-field platform-form-field--tall">
            <span className="muted">Handoff notes</span>
            <textarea
              className="input-control"
              name="handoff_notes"
              onChange={(event) => setHandoffNotes(event.target.value)}
              placeholder="Summarize what was handed over, what remains customer-owned, and any gated setup."
              value={handoffNotes}
            />
          </label>
          <div className="form-actions-bar">
            <span className="muted">Handoff moves launch readiness to customer ready and records audit evidence.</span>
            <button
              className="button button--primary"
              disabled={Boolean(busy) || !hasSafeApplyEvidence || handoffCompleted}
              onClick={handleCustomerHandoff}
              type="button"
            >
              {busy === "handoff" ? "Completing..." : handoffCompleted ? "Handoff complete" : "Complete customer handoff"}
            </button>
          </div>
        </article>
      </section>

      <section className="section">
        <article className="record-card">
          <div className="record-card__title-wrap">
            <div className="record-card__title">
              <h2>Launch evidence</h2>
              <span className="record-chip">{launchRuns.length} runs</span>
            </div>
            <p className="section-copy">Preview and apply runs with module-level evidence for QA and production signoff.</p>
          </div>
          <div className="tenant-support-access-list">
            {launchRuns.map((run) => {
              const evidenceCards = launchEvidenceCards(run);
              return (
                <div className="tenant-support-access-row tenant-support-access-row--stacked" key={run.id}>
                  <div>
                    <strong>{titleCase(run.run_type)} - {titleCase(run.status)}</strong>
                    <span>{run.blueprint_ref} {run.blueprint_version} - {formatDateTime(run.created_at)}</span>
                    <span>{run.result_payload && "applied_modules" in run.result_payload ? `Applied: ${String((run.result_payload as { applied_modules?: string[] }).applied_modules?.join(", ") || "none")}` : `${run.seeded_items.length} module evidence rows`}</span>
                  </div>
                  <span className="record-chip">{run.requested_by_identifier || "system"}</span>
                  <span className="record-chip">{run.seeded_items.filter((item) => item.status === "succeeded").length} succeeded</span>
                  <span className="record-chip">{run.seeded_items.filter((item) => item.status === "skipped").length} skipped</span>
                  {evidenceCards.length ? (
                    <div className="platform-launch-evidence-grid">
                      {evidenceCards.map((card) => (
                        <LaunchEvidenceCard card={card} key={card.title} />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!launchRuns.length ? (
              <div className="notice">
                <strong>No launch evidence yet.</strong>
                <span className="muted">Run a preview to create the first audited launch plan.</span>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LaunchPostureCard({
  posture,
}: {
  posture: {
    title: string;
    chip: string;
    tone: string;
    summary: string;
  };
}) {
  const chipClass = posture.tone === "success" ? "record-chip--success" : posture.tone === "warning" ? "record-chip--warning" : "record-chip--neutral";
  return (
    <div className="platform-launch-posture-card">
      <div className="platform-launch-posture-card__header">
        <strong>{posture.title}</strong>
        <span className={`record-chip ${chipClass}`}>{posture.chip}</span>
      </div>
      <span>{posture.summary}</span>
    </div>
  );
}

function LaunchEvidenceCard({
  card,
}: {
  card: {
    title: string;
    chip: string;
    tone: "success" | "warning";
    lines: string[];
  };
}) {
  return (
    <div className="platform-launch-evidence-card">
      <div className="platform-launch-posture-card__header">
        <strong>{card.title}</strong>
        <span className={`record-chip ${card.tone === "success" ? "record-chip--success" : "record-chip--warning"}`}>{card.chip}</span>
      </div>
      {card.lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}
