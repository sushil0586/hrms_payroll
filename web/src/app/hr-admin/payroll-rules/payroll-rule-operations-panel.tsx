"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminPayrollRuleDefinition, HrAdminPayrollRuleVersion, HrAdminPayrollRulesSetupResponse } from "@/lib/types";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return `${key}: ${String(value[0])}`;
    if (typeof value === "string" && key !== "detail") return `${key}: ${value}`;
  }
  return String((payload as Record<string, unknown>).detail || fallback);
}

function parseJson(value: string, fallback: Record<string, unknown> | string[]) {
  if (!value.trim()) return fallback;
  return JSON.parse(value) as Record<string, unknown> | string[];
}

function configProfile(snapshot: Record<string, unknown>) {
  return typeof snapshot.profile_ref === "string" ? snapshot.profile_ref : "";
}

function TextField({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <input className="input-control" required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <select className="input-control" required={required} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function JsonField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="form-field">
      <span className="muted">{label}</span>
      <textarea className="input-control" rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function definitionToForm(rule?: HrAdminPayrollRuleDefinition | null, setup?: HrAdminPayrollRulesSetupResponse) {
  return {
    id: rule?.id,
    code: rule?.code ?? "",
    name: rule?.name ?? "",
    rule_type: rule?.rule_type ?? setup?.options.rule_types[0]?.value ?? "earning",
    description: rule?.description ?? "",
    tags: JSON.stringify(rule?.tags ?? ["browser", "phase5d"]),
    config_profile_ref: rule ? configProfile(rule.config_snapshot) : "tenant.payroll.rule.phase5d.v1",
  };
}

function versionToForm(version?: HrAdminPayrollRuleVersion | null, ruleId = "", setup?: HrAdminPayrollRulesSetupResponse) {
  return {
    id: version?.id,
    rule_id: version?.rule_id ?? ruleId,
    version: String(version?.version ?? 1),
    status: version?.status ?? "active",
    expression_language: version?.expression_language ?? setup?.options.expression_languages[0]?.value ?? "python_subset",
    expression: version?.expression ?? "salary.annual_ctc / 12",
    effective_from: version?.effective_from ?? "2026-01-01",
    effective_to: version?.effective_to ?? "",
    input_schema: JSON.stringify(version?.input_schema ?? { required_paths: ["salary.annual_ctc"] }),
    output_schema: JSON.stringify(version?.output_schema ?? { result_path: "components.basic_pay" }),
    rounding_rule_ref: version?.rounding_rule_ref ?? "payroll.round.nearest_rupee.v1",
    config_snapshot: JSON.stringify(version?.config_snapshot ?? {
      component_code: "BASIC_PAY",
      component_name: "Basic Pay",
      component_type: "earning",
      calculation_order: 10,
      output_path: "components.basic_pay",
      profile_ref: "tenant.payroll.rule.version.phase5d.v1",
    }),
  };
}

function replaceOrAppend<Item extends { id: string }>(items: Item[], next: Item) {
  return items.some((item) => item.id === next.id) ? items.map((item) => item.id === next.id ? next : item) : [next, ...items];
}

export function PayrollRuleOperationsPanel({
  initialSetup,
  selectedRule,
  selectedVersion,
}: {
  initialSetup: HrAdminPayrollRulesSetupResponse;
  selectedRule: HrAdminPayrollRuleDefinition | null;
  selectedVersion: HrAdminPayrollRuleVersion | null;
}) {
  const router = useRouter();
  const [setup, setSetup] = useState(initialSetup);
  const [definitionForm, setDefinitionForm] = useState(() => definitionToForm(selectedRule, initialSetup));
  const [versionForm, setVersionForm] = useState(() => versionToForm(selectedVersion, selectedRule?.id ?? initialSetup.rules[0]?.id ?? "", initialSetup));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const ruleTypeOptions = useMemo(() => setup.options.rule_types.map((item) => ({ value: item.value, label: item.label })), [setup.options.rule_types]);
  const ruleOptions = useMemo(() => setup.rules.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })), [setup.rules]);
  const statusOptions = useMemo(() => setup.options.rule_version_statuses.map((item) => ({ value: item.value, label: item.label })), [setup.options.rule_version_statuses]);
  const languageOptions = useMemo(() => setup.options.expression_languages.map((item) => ({ value: item.value, label: item.label })), [setup.options.expression_languages]);

  async function saveDefinition() {
    setSubmitting("definition");
    setFeedback(null);
    let tags: Record<string, unknown> | string[];
    try {
      tags = parseJson(definitionForm.tags, []);
    } catch {
      setSubmitting(null);
      setFeedback({ tone: "error", message: "Rule tags JSON is invalid." });
      return;
    }
    const response = await fetch(definitionForm.id ? `/api/hr-admin/payroll-rule-definitions/${definitionForm.id}` : "/api/hr-admin/payroll-rule-definitions", {
      method: definitionForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: definitionForm.code,
        name: definitionForm.name,
        rule_type: definitionForm.rule_type,
        description: definitionForm.description,
        tags,
        config_snapshot: definitionForm.config_profile_ref ? { profile_ref: definitionForm.config_profile_ref } : {},
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, "Unable to save payroll rule definition.") });
      return;
    }
    const rule = payload as HrAdminPayrollRuleDefinition;
    setSetup((current) => ({ ...current, rules: replaceOrAppend(current.rules, rule) }));
    setDefinitionForm(definitionToForm(rule, setup));
    setVersionForm((current) => ({ ...current, rule_id: rule.id }));
    setFeedback({ tone: "success", message: "payroll rule definition saved." });
    router.refresh();
  }

  async function saveVersion() {
    setSubmitting("version");
    setFeedback(null);
    let inputSchema: Record<string, unknown> | string[];
    let outputSchema: Record<string, unknown> | string[];
    let configSnapshot: Record<string, unknown> | string[];
    try {
      inputSchema = parseJson(versionForm.input_schema, {});
      outputSchema = parseJson(versionForm.output_schema, {});
      configSnapshot = parseJson(versionForm.config_snapshot, {});
    } catch {
      setSubmitting(null);
      setFeedback({ tone: "error", message: "Rule version JSON is invalid." });
      return;
    }
    const response = await fetch(versionForm.id ? `/api/hr-admin/payroll-rule-versions/${versionForm.id}` : "/api/hr-admin/payroll-rule-versions", {
      method: versionForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rule_id: versionForm.rule_id,
        version: Number(versionForm.version),
        status: versionForm.status,
        expression_language: versionForm.expression_language,
        expression: versionForm.expression,
        effective_from: versionForm.effective_from,
        effective_to: versionForm.effective_to || null,
        input_schema: inputSchema,
        output_schema: outputSchema,
        rounding_rule_ref: versionForm.rounding_rule_ref,
        config_snapshot: configSnapshot,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(null);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload, "Unable to save payroll rule version.") });
      return;
    }
    const version = payload as HrAdminPayrollRuleVersion;
    setSetup((current) => ({ ...current, versions: replaceOrAppend(current.versions, version) }));
    setVersionForm(versionToForm(version, version.rule_id, setup));
    setFeedback({ tone: "success", message: "payroll rule version saved." });
    router.refresh();
  }

  return (
    <section className="section section--tight salary-crud-console payroll-rule-operations-panel" aria-labelledby="payroll-rule-operations-title">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Browser CRUD</span>
          <h2 id="payroll-rule-operations-title">Payroll rule controls</h2>
        </div>
        <span className="payroll-setup-count">2 forms</span>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""}`} role={feedback.tone === "success" ? "status" : "alert"}>
          <strong>{feedback.tone === "success" ? "Saved." : "Save failed."}</strong>
          <span className="muted">{feedback.message}</span>
        </div>
      ) : null}

      <div className="salary-crud-grid payroll-rule-operations-grid">
        <form
          aria-label="Payroll rule definition form"
          className="salary-crud-form"
          data-testid="payroll-rule-definition-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveDefinition();
          }}
        >
          <div className="salary-crud-form__header">
            <div><span className="workspace-card__eyebrow">{definitionForm.id ? "Edit mode" : "Create mode"}</span><h3>Rule definition</h3></div>
            <button className="button button--secondary button--compact" type="button" onClick={() => setDefinitionForm(definitionToForm(null, setup))}>New</button>
          </div>
          <div className="form-grid salary-crud-form-grid">
            <TextField label="Code" required value={definitionForm.code} onChange={(value) => setDefinitionForm((current) => ({ ...current, code: value }))} />
            <TextField label="Name" required value={definitionForm.name} onChange={(value) => setDefinitionForm((current) => ({ ...current, name: value }))} />
            <SelectField label="Rule type" required value={definitionForm.rule_type} options={ruleTypeOptions} onChange={(value) => setDefinitionForm((current) => ({ ...current, rule_type: value }))} />
            <TextField label="Description" value={definitionForm.description} onChange={(value) => setDefinitionForm((current) => ({ ...current, description: value }))} />
            <JsonField label="Tags JSON" value={definitionForm.tags} onChange={(value) => setDefinitionForm((current) => ({ ...current, tags: value }))} />
            <TextField label="Config profile reference" value={definitionForm.config_profile_ref} onChange={(value) => setDefinitionForm((current) => ({ ...current, config_profile_ref: value }))} />
          </div>
          <div className="salary-crud-list" aria-label="Payroll rule records">
            {setup.rules.slice(0, 6).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => {
                setDefinitionForm(definitionToForm(item, setup));
                setVersionForm((current) => ({ ...current, rule_id: item.id }));
              }}>
                <strong>{item.name}</strong>
                <span>{item.code}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "definition"} type="submit">
            {submitting === "definition" ? "Saving..." : definitionForm.id ? "Save rule" : "Create rule"}
          </button>
        </form>

        <form
          aria-label="Payroll rule version form"
          className="salary-crud-form"
          data-testid="payroll-rule-version-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveVersion();
          }}
        >
          <div className="salary-crud-form__header">
            <div><span className="workspace-card__eyebrow">{versionForm.id ? "Edit mode" : "Create mode"}</span><h3>Rule version</h3></div>
            <button className="button button--secondary button--compact" type="button" onClick={() => setVersionForm(versionToForm(null, definitionForm.id ?? setup.rules[0]?.id ?? "", setup))}>New</button>
          </div>
          <div className="form-grid salary-crud-form-grid">
            <SelectField label="Rule" required value={versionForm.rule_id} options={ruleOptions} onChange={(value) => setVersionForm((current) => ({ ...current, rule_id: value }))} />
            <TextField label="Version" required type="number" value={versionForm.version} onChange={(value) => setVersionForm((current) => ({ ...current, version: value }))} />
            <SelectField label="Status" required value={versionForm.status} options={statusOptions} onChange={(value) => setVersionForm((current) => ({ ...current, status: value }))} />
            <SelectField label="Expression language" required value={versionForm.expression_language} options={languageOptions} onChange={(value) => setVersionForm((current) => ({ ...current, expression_language: value }))} />
            <TextField label="Expression" required value={versionForm.expression} onChange={(value) => setVersionForm((current) => ({ ...current, expression: value }))} />
            <TextField label="Effective from" required type="date" value={versionForm.effective_from} onChange={(value) => setVersionForm((current) => ({ ...current, effective_from: value }))} />
            <TextField label="Effective to" type="date" value={versionForm.effective_to} onChange={(value) => setVersionForm((current) => ({ ...current, effective_to: value }))} />
            <TextField label="Rounding rule reference" value={versionForm.rounding_rule_ref} onChange={(value) => setVersionForm((current) => ({ ...current, rounding_rule_ref: value }))} />
            <JsonField label="Input schema JSON" value={versionForm.input_schema} onChange={(value) => setVersionForm((current) => ({ ...current, input_schema: value }))} />
            <JsonField label="Output schema JSON" value={versionForm.output_schema} onChange={(value) => setVersionForm((current) => ({ ...current, output_schema: value }))} />
            <JsonField label="Config snapshot JSON" value={versionForm.config_snapshot} onChange={(value) => setVersionForm((current) => ({ ...current, config_snapshot: value }))} />
          </div>
          <div className="salary-crud-list" aria-label="Payroll rule version records">
            {setup.versions.slice(0, 6).map((item) => (
              <button className="salary-crud-record" key={item.id} type="button" onClick={() => setVersionForm(versionToForm(item, item.rule_id, setup))}>
                <strong>{item.rule_name}</strong>
                <span>v{item.version} / {item.status}</span>
              </button>
            ))}
          </div>
          <button className="button button--primary" disabled={submitting === "version" || !ruleOptions.length} type="submit">
            {submitting === "version" ? "Saving..." : versionForm.id ? "Save version" : "Create version"}
          </button>
        </form>
      </div>
    </section>
  );
}
