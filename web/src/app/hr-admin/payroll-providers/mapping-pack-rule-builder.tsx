"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminPayrollProviderSchemaMappingPack } from "@/lib/types";

type MappingRule = {
  mode?: string;
  source_path: string;
  target_path: string;
  required: boolean;
  value_type: string;
  gate_ref: string;
  default?: string;
  group_by_path?: string;
  group_key_target_path?: string;
  rows_target_path?: string;
  row_mappings?: Record<string, unknown>[];
  aggregate_rules?: Record<string, unknown>[];
};

type ValidationRule = {
  path: string;
  required: boolean;
  gate_ref: string;
};

type SimulationGate = {
  ref: string;
  source_path?: string;
  target_path?: string;
  path?: string;
  required: boolean;
  passed: boolean;
};

type SimulationResult = {
  status: string;
  simulation_run_id?: string;
  comparison_profile_ref?: string;
  gate_count: number;
  passed_gate_count: number;
  blocking_gate_refs: string[];
  provider_payload: Record<string, unknown>;
  baseline_provider_payload?: Record<string, unknown>;
  comparison?: {
    status?: string;
    changed_path_count?: number;
    added_path_count?: number;
    removed_path_count?: number;
    diffs?: Record<string, unknown>[];
  };
  gates: SimulationGate[];
};

type Props = {
  pack: HrAdminPayrollProviderSchemaMappingPack;
};

const VALUE_TYPES = ["string", "decimal_string", "money_string", "integer", "boolean"];
const TRANSFORM_MODES = ["copy", "expand_rows", "group_rows"];
const ENFORCEMENT_MODES = ["disabled", "warn", "strict"];

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

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

function asMappingRule(value: Record<string, unknown>, index: number): MappingRule {
  return {
    mode: String(value.mode ?? value.transform_mode ?? "copy"),
    source_path: String(value.source_path ?? ""),
    target_path: String(value.target_path ?? ""),
    required: Boolean(value.required),
    value_type: String(value.value_type ?? "string"),
    gate_ref: String(value.gate_ref ?? value.target_path ?? `transform_${index + 1}`),
    default: value.default === undefined ? "" : String(value.default),
    group_by_path: value.group_by_path === undefined ? "" : String(value.group_by_path),
    group_key_target_path: value.group_key_target_path === undefined ? "" : String(value.group_key_target_path),
    rows_target_path: value.rows_target_path === undefined ? "" : String(value.rows_target_path),
    row_mappings: Array.isArray(value.row_mappings) ? value.row_mappings.filter(isRecord) : [],
    aggregate_rules: Array.isArray(value.aggregate_rules) ? value.aggregate_rules.filter(isRecord) : [],
  };
}

function asValidationRule(value: Record<string, unknown>, index: number): ValidationRule {
  return {
    path: String(value.path ?? ""),
    required: value.required === undefined ? true : Boolean(value.required),
    gate_ref: String(value.gate_ref ?? value.path ?? `validation_${index + 1}`),
  };
}

function compactMappingRule(rule: MappingRule): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    mode: rule.mode || "copy",
    source_path: rule.source_path.trim(),
    target_path: rule.target_path.trim(),
    required: rule.required,
    value_type: rule.value_type,
    gate_ref: rule.gate_ref.trim(),
  };
  if (rule.group_by_path?.trim()) payload.group_by_path = rule.group_by_path.trim();
  if (rule.group_key_target_path?.trim()) payload.group_key_target_path = rule.group_key_target_path.trim();
  if (rule.rows_target_path?.trim()) payload.rows_target_path = rule.rows_target_path.trim();
  if (rule.row_mappings?.length) payload.row_mappings = rule.row_mappings;
  if (rule.aggregate_rules?.length) payload.aggregate_rules = rule.aggregate_rules;
  if (rule.default?.trim()) {
    payload.default = rule.default.trim();
  }
  return payload;
}

function compactValidationRule(rule: ValidationRule): Record<string, unknown> {
  return {
    path: rule.path.trim(),
    required: rule.required,
    gate_ref: rule.gate_ref.trim(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function snapshotPathValue(payload: Record<string, unknown>, path: string): unknown {
  let cursor: unknown = payload;
  for (const part of path.split(".").filter(Boolean)) {
    if (Array.isArray(cursor) && /^\d+$/.test(part)) {
      cursor = cursor[Number(part)];
    } else if (isRecord(cursor)) {
      cursor = cursor[part];
    } else {
      return undefined;
    }
  }
  return cursor;
}

function setSnapshotPathValue(payload: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return;
  let cursor = payload;
  parts.slice(0, -1).forEach((part) => {
    if (!isRecord(cursor[part])) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  });
  cursor[parts[parts.length - 1]] = value;
}

function appendSnapshotPathValues(payload: Record<string, unknown>, path: string, values: unknown[]) {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return;
  let cursor = payload;
  parts.slice(0, -1).forEach((part) => {
    if (!isRecord(cursor[part])) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  });
  const key = parts[parts.length - 1];
  if (!Array.isArray(cursor[key])) {
    cursor[key] = [];
  }
  (cursor[key] as unknown[]).push(...values);
}

function mappingValueMissing(value: unknown) {
  return value === undefined || value === null || value === "";
}

function formatMappingValue(value: unknown, valueType: string): unknown {
  if (value === null || value === undefined) return value;
  if (valueType === "string") return String(value);
  if (valueType === "integer") {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isNaN(parsed) ? value : parsed;
  }
  if (valueType === "decimal_string" || valueType === "money_string") {
    const parsed = Number(String(value));
    return Number.isNaN(parsed) ? String(value) : parsed.toFixed(2);
  }
  if (valueType === "boolean") return Boolean(value);
  return value;
}

function rowPayload(sourceRow: unknown, rowMappings: Record<string, unknown>[], gateRef: string, rowIndex: number) {
  const payload: Record<string, unknown> = {};
  const gates: SimulationGate[] = [];
  const source = isRecord(sourceRow) ? sourceRow : { value: sourceRow };
  rowMappings.forEach((mapping, index) => {
    const sourcePath = String(mapping.source_path ?? "").trim();
    const targetPath = String(mapping.target_path ?? "").trim();
    const required = Boolean(mapping.required);
    let value = sourcePath ? snapshotPathValue(source, sourcePath) : source;
    if (mappingValueMissing(value) && mapping.default !== undefined) {
      value = mapping.default;
    }
    value = formatMappingValue(value, String(mapping.value_type ?? ""));
    const mappingGateRef = String(mapping.gate_ref ?? (targetPath || `row_mapping_${index + 1}`));
    const passed = Boolean(targetPath && (!mappingValueMissing(value) || !required));
    gates.push({
      ref: `mapping_rule:${gateRef}:row:${rowIndex + 1}:${mappingGateRef}`,
      source_path: sourcePath,
      target_path: targetPath,
      required,
      passed,
    });
    if (targetPath && !mappingValueMissing(value)) {
      setSnapshotPathValue(payload, targetPath, value);
    }
  });
  return { payload, gates };
}

function decimalValue(value: unknown) {
  const parsed = Number(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function applyAggregateRules(targetPayload: Record<string, unknown>, sourceRows: unknown[], aggregateRules: Record<string, unknown>[]) {
  aggregateRules.forEach((rule) => {
    const targetPath = String(rule.target_path ?? "").trim();
    if (!targetPath) return;
    const operation = String(rule.operation ?? "sum").trim().toLowerCase();
    const sourcePath = String(rule.source_path ?? "").trim();
    const valueType = String(rule.value_type ?? "decimal_string");
    let value: unknown;
    if (operation === "count") {
      value = sourceRows.length;
    } else if (operation === "sum") {
      value = sourceRows.reduce<number>((total, row) => total + decimalValue(snapshotPathValue(isRecord(row) ? row : { value: row }, sourcePath || "value")), 0);
    } else {
      return;
    }
    setSnapshotPathValue(targetPayload, targetPath, formatMappingValue(value, valueType));
  });
}

function defaultSimulationSample(pack: HrAdminPayrollProviderSchemaMappingPack): Record<string, unknown> {
  if (Object.keys(pack.sample_request_snapshot).length) {
    return pack.sample_request_snapshot;
  }
  return {
    provider_ref: pack.provider_ref,
    external_reference: `SIM-${pack.artifact_kind}-2026-09`,
    idempotency_key: `${pack.id}-simulation`,
    artifact_snapshot: {
      file_name: `${pack.artifact_kind}.csv`,
      checksum_sha256: "sample-checksum-sha256",
      file_size_bytes: 2048,
      totals_snapshot: {
        net_pay: "125000.25",
        gross_earnings: "150000.00",
      },
      config_snapshot: {
        bank_file_profile_ref: "india.neft.v2",
        filing_type_ref: "monthly_return",
        employer_registration_number: "REG-001",
      },
      line_snapshot: [
        { employee_code: "EMP-001", employee_name: "Asha Mehta", net_pay: "1000.25", cost_center_code: "CC-ENG" },
        { employee_code: "EMP-002", employee_name: "Ravi Shah", net_pay: "500.50", cost_center_code: "CC-OPS" },
      ],
    },
  };
}

function runLocalSimulation({
  requestSnapshot,
  transformRules,
  validationRules,
}: {
  requestSnapshot: Record<string, unknown>;
  transformRules: MappingRule[];
  validationRules: ValidationRule[];
}): SimulationResult {
  const providerPayload: Record<string, unknown> = {};
  const gates: SimulationGate[] = [];
  transformRules.forEach((rule, index) => {
    const mode = rule.mode || "copy";
    const gateRef = rule.gate_ref.trim() || rule.target_path.trim() || `transform_${index + 1}`;
    if (mode === "expand_rows" || mode === "group_rows") {
      const sourceRowsRaw = snapshotPathValue(requestSnapshot, rule.source_path.trim());
      const sourceRows = Array.isArray(sourceRowsRaw) ? sourceRowsRaw : [];
      const rowMappings = rule.row_mappings ?? [];
      gates.push({
        ref: `mapping_rule:${gateRef}`,
        source_path: rule.source_path.trim(),
        target_path: rule.target_path.trim(),
        required: rule.required,
        passed: Boolean(rule.target_path.trim() && rowMappings.length && (sourceRows.length || !rule.required)),
      });
      if (!rule.target_path.trim() || !rowMappings.length) return;
      if (mode === "expand_rows") {
        const rows = sourceRows.map((sourceRow, rowIndex) => {
          const result = rowPayload(sourceRow, rowMappings, gateRef, rowIndex);
          gates.push(...result.gates);
          return result.payload;
        });
        appendSnapshotPathValues(providerPayload, rule.target_path.trim(), rows);
        return;
      }
      const grouped = new Map<string, unknown[]>();
      sourceRows.forEach((sourceRow) => {
        const source = isRecord(sourceRow) ? sourceRow : { value: sourceRow };
        const groupKey = String(snapshotPathValue(source, rule.group_by_path?.trim() || "") ?? "unassigned");
        grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), sourceRow]);
      });
      const groups: Record<string, unknown>[] = [];
      grouped.forEach((groupRows, groupKey) => {
        const groupPayload: Record<string, unknown> = {};
        if (rule.group_key_target_path?.trim()) {
          setSnapshotPathValue(groupPayload, rule.group_key_target_path.trim(), groupKey);
        }
        const rowPayloads = groupRows.map((sourceRow, rowIndex) => {
          const result = rowPayload(sourceRow, rowMappings, `${gateRef}:${groupKey}`, rowIndex);
          gates.push(...result.gates);
          return result.payload;
        });
        if (rule.rows_target_path?.trim()) {
          setSnapshotPathValue(groupPayload, rule.rows_target_path.trim(), rowPayloads);
        }
        applyAggregateRules(groupPayload, groupRows, rule.aggregate_rules ?? []);
        groups.push(groupPayload);
      });
      appendSnapshotPathValues(providerPayload, rule.target_path.trim(), groups);
      return;
    }
    let value = snapshotPathValue(requestSnapshot, rule.source_path.trim());
    if (mappingValueMissing(value) && rule.default?.trim()) {
      value = rule.default.trim();
    }
    value = formatMappingValue(value, rule.value_type);
    const passed = Boolean(rule.target_path.trim() && (!mappingValueMissing(value) || !rule.required));
    gates.push({
      ref: `mapping_rule:${gateRef}`,
      source_path: rule.source_path.trim(),
      target_path: rule.target_path.trim(),
      required: rule.required,
      passed,
    });
    if (rule.target_path.trim() && !mappingValueMissing(value)) {
      setSnapshotPathValue(providerPayload, rule.target_path.trim(), value);
    }
  });
  validationRules.forEach((rule, index) => {
    const value = snapshotPathValue(providerPayload, rule.path.trim());
    const passed = Boolean(!mappingValueMissing(value) || !rule.required);
    gates.push({
      ref: rule.gate_ref.trim() || `validation_${index + 1}`,
      path: rule.path.trim(),
      required: rule.required,
      passed,
    });
  });
  const blockingGateRefs = gates.filter((gate) => !gate.passed).map((gate) => gate.ref);
  return {
    status: blockingGateRefs.length ? "blocked" : "passed",
    gate_count: gates.length,
    passed_gate_count: gates.length - blockingGateRefs.length,
    blocking_gate_refs: blockingGateRefs,
    provider_payload: providerPayload,
    gates,
  };
}

export function MappingPackRuleBuilder({ pack }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetSchemaRef, setTargetSchemaRef] = useState(pack.target_schema_ref);
  const [enforcementMode, setEnforcementMode] = useState(pack.enforcement_mode);
  const [transformRules, setTransformRules] = useState<MappingRule[]>(() => pack.transform_rules.map(asMappingRule));
  const [validationRules, setValidationRules] = useState<ValidationRule[]>(() => pack.validation_rules.map(asValidationRule));
  const [sampleRequestJson, setSampleRequestJson] = useState(() => JSON.stringify(defaultSimulationSample(pack), null, 2));
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const canEdit = pack.status !== "active" && pack.status !== "archived";
  const invalidRuleCount = useMemo(
    () => transformRules.filter((rule) => !rule.source_path.trim() || !rule.target_path.trim()).length
      + validationRules.filter((rule) => !rule.path.trim()).length,
    [transformRules, validationRules],
  );

  function updateTransformRule(index: number, patch: Partial<MappingRule>) {
    setTransformRules((rules) => rules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule));
  }

  function updateValidationRule(index: number, patch: Partial<ValidationRule>) {
    setValidationRules((rules) => rules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule));
  }

  async function saveRules() {
    let requestSnapshot: Record<string, unknown>;
    try {
      const parsed = JSON.parse(sampleRequestJson) as unknown;
      if (!isRecord(parsed)) {
        throw new Error("Sample request JSON must be an object.");
      }
      requestSnapshot = parsed;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sample request JSON is invalid.");
      return;
    }
    setIsSaving(true);
    setNotice("");
    const response = await fetch(`/api/hr-admin/payroll-provider-schema-mapping-packs/${pack.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_schema_ref: targetSchemaRef,
        enforcement_mode: enforcementMode,
        transform_rules: transformRules.map(compactMappingRule),
        validation_rules: validationRules.map(compactValidationRule),
        sample_request_snapshot: requestSnapshot,
        change_reason: "Updated through visual mapping rule builder.",
      }),
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Mapping rules could not be saved."));
      return;
    }
    setNotice("Mapping rules saved.");
    router.refresh();
  }

  async function runSimulation() {
    setIsSimulating(true);
    setNotice("");
    let requestSnapshot: Record<string, unknown>;
    try {
      const parsed = JSON.parse(sampleRequestJson) as unknown;
      if (!isRecord(parsed)) {
        throw new Error("Sample request JSON must be an object.");
      }
      requestSnapshot = parsed;
    } catch (error) {
      setIsSimulating(false);
      setNotice(error instanceof Error ? error.message : "Sample request JSON is invalid.");
      return;
    }
    const localSimulation = runLocalSimulation({ requestSnapshot, transformRules, validationRules });
    const response = await fetch(`/api/hr-admin/payroll-provider-schema-mapping-packs/${pack.id}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_snapshot: requestSnapshot,
        mapping_contract: {
          target_schema_ref: targetSchemaRef,
          enforcement_mode: enforcementMode,
          transform_rules: transformRules.map(compactMappingRule),
          validation_rules: validationRules.map(compactValidationRule),
        },
      }),
    }).catch(() => null);
    if (response?.ok) {
      const result = await response.json().catch(() => ({}));
      const upstreamSimulation = isRecord(result) && isRecord(result.simulation) ? result.simulation as unknown as SimulationResult : localSimulation;
      setSimulation(upstreamSimulation);
      setNotice("Preview completed.");
    } else {
      setSimulation(localSimulation);
      setNotice("Preview completed locally.");
    }
    setIsSimulating(false);
  }

  return (
    <>
      <button className="button button--secondary" type="button" onClick={() => setOpen(true)}>
        Edit rules
      </button>
      {open ? (
        <div className="payroll-rule-builder-shell" role="dialog" aria-modal="true" aria-label={`${pack.mapping_profile_ref} rule builder`}>
          <button className="payroll-rule-builder-backdrop" type="button" aria-label="Close rule builder" onClick={() => setOpen(false)} />
          <aside className="payroll-rule-builder-drawer">
            <div className="payroll-rule-builder-header">
              <div>
                <span className="workspace-card__eyebrow">Mapping rule builder</span>
                <h2>{pack.artifact_kind_label}</h2>
                <p>{pack.mapping_profile_ref} / v{pack.version}</p>
              </div>
              <button className="button button--secondary" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="payroll-rule-builder-state-grid">
              <label>
                <span>Target schema</span>
                <input value={targetSchemaRef} onChange={(event) => setTargetSchemaRef(event.target.value)} disabled={!canEdit} />
              </label>
              <label>
                <span>Enforcement</span>
                <select value={enforcementMode} onChange={(event) => setEnforcementMode(event.target.value)} disabled={!canEdit}>
                  {ENFORCEMENT_MODES.map((mode) => <option key={mode} value={mode}>{titleCase(mode)}</option>)}
                </select>
              </label>
              <div>
                <span>Rules</span>
                <strong>{transformRules.length} transforms / {validationRules.length} gates</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{pack.status_label}</strong>
              </div>
            </div>

            {!canEdit ? (
              <div className="payroll-rule-builder-lock">
                <strong>Clone required</strong>
                <span>Active and archived versions are locked.</span>
              </div>
            ) : null}

            <section className="payroll-rule-builder-section payroll-rule-builder-preview">
              <div className="payroll-rule-builder-section-header">
                <div>
                  <span className="workspace-card__eyebrow">Simulation preview</span>
                  <h3>Sample request</h3>
                </div>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={runSimulation}
                  disabled={isSimulating || invalidRuleCount > 0}
                >
                  {isSimulating ? "Running" : "Run preview"}
                </button>
              </div>
              <label className="payroll-rule-builder-sample">
                <span>Sample request JSON</span>
                <textarea value={sampleRequestJson} onChange={(event) => setSampleRequestJson(event.target.value)} />
              </label>
              {simulation ? (
                <div className="payroll-rule-builder-preview-grid">
                  <article>
                    <span>Status</span>
                    <strong>{titleCase(simulation.status)}</strong>
                  </article>
                  <article>
                    <span>Gates</span>
                    <strong>{simulation.passed_gate_count}/{simulation.gate_count}</strong>
                  </article>
                  <article>
                    <span>Blockers</span>
                    <strong>{simulation.blocking_gate_refs.length}</strong>
                  </article>
                  <article>
                    <span>Comparison</span>
                    <strong>{titleCase(String(simulation.comparison?.status ?? "no_baseline"))}</strong>
                  </article>
                  <article>
                    <span>Diffs</span>
                    <strong>{simulation.comparison?.changed_path_count ?? 0} changed / {simulation.comparison?.added_path_count ?? 0} added / {simulation.comparison?.removed_path_count ?? 0} removed</strong>
                  </article>
                  <pre aria-label="Mapped provider payload">{JSON.stringify(simulation.provider_payload, null, 2)}</pre>
                  {simulation.comparison?.diffs?.length ? (
                    <div className="payroll-rule-builder-diff-preview" aria-label="Mapping comparison diff">
                      {simulation.comparison.diffs.slice(0, 8).map((diff) => (
                        <span key={String(diff.path)}>
                          {String(diff.path)} / {titleCase(String(diff.change_type ?? "changed"))}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="payroll-rule-builder-gate-preview">
                    {simulation.gates.map((gate) => (
                      <span className={gate.passed ? "is-passed" : "is-blocked"} key={gate.ref}>
                        {gate.ref}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="payroll-rule-builder-section">
              <div className="payroll-rule-builder-section-header">
                <div>
                  <span className="workspace-card__eyebrow">Transforms</span>
                  <h3>Source to provider payload</h3>
                </div>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setTransformRules((rules) => [
                    ...rules,
                    { mode: "copy", source_path: "", target_path: "", required: false, value_type: "string", gate_ref: `transform_${rules.length + 1}` },
                  ])}
                >
                  Add
                </button>
              </div>
              <div className="payroll-rule-builder-rule-list">
                {transformRules.map((rule, index) => (
                  <article className="payroll-rule-builder-rule" key={`${rule.gate_ref}-${index}`}>
                    <label>
                      <span>Mode</span>
                      <select value={rule.mode ?? "copy"} onChange={(event) => updateTransformRule(index, { mode: event.target.value })} disabled={!canEdit}>
                        {TRANSFORM_MODES.map((mode) => <option key={mode} value={mode}>{titleCase(mode)}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Source path</span>
                      <input value={rule.source_path} onChange={(event) => updateTransformRule(index, { source_path: event.target.value })} disabled={!canEdit} />
                    </label>
                    <label>
                      <span>Target path</span>
                      <input value={rule.target_path} onChange={(event) => updateTransformRule(index, { target_path: event.target.value })} disabled={!canEdit} />
                    </label>
                    <label>
                      <span>Type</span>
                      <select value={rule.value_type} onChange={(event) => updateTransformRule(index, { value_type: event.target.value })} disabled={!canEdit}>
                        {VALUE_TYPES.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Gate ref</span>
                      <input value={rule.gate_ref} onChange={(event) => updateTransformRule(index, { gate_ref: event.target.value })} disabled={!canEdit} />
                    </label>
                    <label>
                      <span>Default</span>
                      <input value={rule.default ?? ""} onChange={(event) => updateTransformRule(index, { default: event.target.value })} disabled={!canEdit} />
                    </label>
                    <label className="payroll-rule-builder-check">
                      <input type="checkbox" checked={rule.required} onChange={(event) => updateTransformRule(index, { required: event.target.checked })} disabled={!canEdit} />
                      <span>Required</span>
                    </label>
                    {(rule.mode === "expand_rows" || rule.mode === "group_rows") ? (
                      <div className="payroll-rule-builder-advanced-summary">
                        <span>{titleCase(rule.mode)}</span>
                        <span>{rule.row_mappings?.length ?? 0} row mappings</span>
                        <span>{rule.aggregate_rules?.length ?? 0} aggregates</span>
                        {rule.group_by_path ? <code>{rule.group_by_path}</code> : null}
                      </div>
                    ) : null}
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={!canEdit || transformRules.length <= 1}
                      onClick={() => setTransformRules((rules) => rules.filter((_, ruleIndex) => ruleIndex !== index))}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="payroll-rule-builder-section">
              <div className="payroll-rule-builder-section-header">
                <div>
                  <span className="workspace-card__eyebrow">Validations</span>
                  <h3>Provider payload gates</h3>
                </div>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setValidationRules((rules) => [
                    ...rules,
                    { path: "", required: true, gate_ref: `validation_${rules.length + 1}` },
                  ])}
                >
                  Add
                </button>
              </div>
              <div className="payroll-rule-builder-rule-list">
                {validationRules.map((rule, index) => (
                  <article className="payroll-rule-builder-validation" key={`${rule.gate_ref}-${index}`}>
                    <label>
                      <span>Payload path</span>
                      <input value={rule.path} onChange={(event) => updateValidationRule(index, { path: event.target.value })} disabled={!canEdit} />
                    </label>
                    <label>
                      <span>Gate ref</span>
                      <input value={rule.gate_ref} onChange={(event) => updateValidationRule(index, { gate_ref: event.target.value })} disabled={!canEdit} />
                    </label>
                    <label className="payroll-rule-builder-check">
                      <input type="checkbox" checked={rule.required} onChange={(event) => updateValidationRule(index, { required: event.target.checked })} disabled={!canEdit} />
                      <span>Required</span>
                    </label>
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={!canEdit || validationRules.length <= 1}
                      onClick={() => setValidationRules((rules) => rules.filter((_, ruleIndex) => ruleIndex !== index))}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <div className="payroll-rule-builder-footer">
              <div>
                <span>{invalidRuleCount} incomplete</span>
                {notice ? <strong role="status">{notice}</strong> : null}
              </div>
              <button className="button button--primary" type="button" onClick={saveRules} disabled={!canEdit || isSaving || invalidRuleCount > 0}>
                {isSaving ? "Saving" : "Save rules"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
