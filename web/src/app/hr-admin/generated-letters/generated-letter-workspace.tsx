"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import type {
  HrAdminEmployeeListItem,
  HrAdminEnumOption,
  HrAdminGeneratedLetter,
  HrAdminGeneratedLetterDraft,
  HrAdminGeneratedLetterPreview,
} from "@/lib/types";

type Props = {
  employees: HrAdminEmployeeListItem[];
  letterTypes: HrAdminEnumOption[];
  initialLetters: HrAdminGeneratedLetter[];
};

const DEFAULT_TEMPLATE_BODY =
  "Dear {{ first_name }},\n\nThis confirms {{ employee_name }} as {{ designation }} at {{ legal_entity }} effective {{ issue_date }}.\n\nRegards,\nPeople Operations";

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
    if (typeof value === "string" && value) return value;
  }
  return fallback;
}

function parsePayloadValues(value: string) {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Payload values must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function GeneratedLetterWorkspace({ employees, letterTypes, initialLetters }: Props) {
  const router = useRouter();
  const defaultEmployeeId = employees[0]?.id ?? "";
  const defaultLetterType = letterTypes[0]?.value ?? "other";
  const [draft, setDraft] = useState<HrAdminGeneratedLetterDraft>({
    employee_id: defaultEmployeeId,
    letter_type: defaultLetterType,
    title: "Confirmation Letter",
    template_code: "confirmation-standard",
    issue_date: "2026-06-07",
    workflow_reference: "",
    template_body: DEFAULT_TEMPLATE_BODY,
    payload_values: {},
  });
  const [payloadJson, setPayloadJson] = useState("{\n  \"reference_number\": \"HR/CONF/0042\"\n}");
  const [preview, setPreview] = useState<HrAdminGeneratedLetterPreview | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState<HrAdminGeneratedLetter | null>(null);
  const [error, setError] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === draft.employee_id),
    [draft.employee_id, employees],
  );

  function update<Key extends keyof HrAdminGeneratedLetterDraft>(
    key: Key,
    value: HrAdminGeneratedLetterDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function buildRequestPayload() {
    const payloadValues = parsePayloadValues(payloadJson);
    return { ...draft, payload_values: payloadValues };
  }

  async function handlePreview() {
    setError("");
    setPreview(null);
    setGeneratedLetter(null);
    setIsPreviewing(true);
    let payload: HrAdminGeneratedLetterDraft;
    try {
      payload = buildRequestPayload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payload values must be valid JSON.");
      setIsPreviewing(false);
      return;
    }

    const response = await fetch("/api/hr-admin/generated-letters/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(responsePayload, "Unable to preview generated letter."));
      setIsPreviewing(false);
      return;
    }
    setPreview(responsePayload as HrAdminGeneratedLetterPreview);
    setIsPreviewing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setGeneratedLetter(null);
    setIsGenerating(true);
    let payload: HrAdminGeneratedLetterDraft;
    try {
      payload = buildRequestPayload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payload values must be valid JSON.");
      setIsGenerating(false);
      return;
    }

    const response = await fetch("/api/hr-admin/generated-letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(responsePayload, "Unable to generate letter."));
      setIsGenerating(false);
      return;
    }
    setGeneratedLetter(responsePayload as HrAdminGeneratedLetter);
    setPreview({
      rendered_text: (responsePayload as HrAdminGeneratedLetter).rendered_text,
      missing_variables: [],
      used_variables: [],
      payload: (responsePayload as HrAdminGeneratedLetter).payload_snapshot,
    });
    setIsGenerating(false);
    router.refresh();
  }

  return (
    <section className="section overview-split">
      <form className="form-shell-card overview-split__primary" onSubmit={handleSubmit}>
        <div className="form-shell-card__header">
          <div>
            <h2>Generate employee letter</h2>
            <p className="section-copy">Create a stored employee artifact from a variable-based HR letter draft.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{draft.letter_type}</strong> type</span>
            <span className="queue-summary-chip"><strong>{selectedEmployee?.employee_code ?? "No employee"}</strong> employee</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          <div className="form-grid">
            <label className="form-field">
              <span className="muted">Employee</span>
              <select
                className="input-control"
                required
                value={draft.employee_id}
                onChange={(event) => update("employee_id", event.target.value)}
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_code})
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Letter type</span>
              <select
                className="input-control"
                value={draft.letter_type}
                onChange={(event) => update("letter_type", event.target.value)}
              >
                {letterTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="muted">Title</span>
              <input
                className="input-control"
                required
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
              />
            </label>
            <label className="form-field">
              <span className="muted">Template code</span>
              <input
                className="input-control"
                value={draft.template_code}
                onChange={(event) => update("template_code", event.target.value)}
              />
            </label>
            <label className="form-field">
              <span className="muted">Issue date</span>
              <input
                className="input-control"
                type="date"
                value={draft.issue_date}
                onChange={(event) => update("issue_date", event.target.value)}
              />
            </label>
            <label className="form-field">
              <span className="muted">Workflow reference</span>
              <input
                className="input-control"
                placeholder="WF-CONF-0042"
                value={draft.workflow_reference}
                onChange={(event) => update("workflow_reference", event.target.value)}
              />
            </label>
            <label className="form-field form-field--full">
              <span className="muted">Template body</span>
              <textarea
                className="input-control"
                rows={8}
                value={draft.template_body}
                onChange={(event) => update("template_body", event.target.value)}
              />
            </label>
            <label className="form-field form-field--full">
              <span className="muted">Payload values JSON</span>
              <textarea
                className="input-control"
                rows={4}
                value={payloadJson}
                onChange={(event) => setPayloadJson(event.target.value)}
              />
            </label>
          </div>
        </div>

        {error ? <div className="notice"><strong>Letter action failed.</strong><span className="muted">{error}</span></div> : null}
        {generatedLetter ? (
          <div className="notice">
            <strong>Letter generated.</strong>
            <span className="muted">{generatedLetter.title} is stored as {generatedLetter.file_name}.</span>
          </div>
        ) : null}

        <div className="form-actions">
          <button className="button button--secondary" disabled={isPreviewing || isGenerating} onClick={handlePreview} type="button">
            {isPreviewing ? "Previewing..." : "Preview letter"}
          </button>
          <button className="button button--primary" disabled={isGenerating || !draft.employee_id} type="submit">
            {isGenerating ? "Generating..." : "Generate letter"}
          </button>
        </div>
      </form>

      <aside className="record-card panel-card-soft overview-split__secondary">
        <div className="record-card__header">
          <div>
            <h2>Rendered preview</h2>
            <p className="section-copy section-copy-soft">Employee variables and payload values render before storage.</p>
          </div>
        </div>
        {preview ? (
          <>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Variables</span><span className="detail-value">{preview.used_variables.length || "Ready"}</span></div>
              <div className="detail-row"><span className="detail-label">Missing</span><span className="detail-value">{preview.missing_variables.length}</span></div>
            </div>
            <pre className="notice" style={{ whiteSpace: "pre-wrap" }}>{preview.rendered_text}</pre>
          </>
        ) : (
          <div className="notice"><strong>No preview yet.</strong><span className="muted">Preview or generate a letter to inspect the rendered text.</span></div>
        )}
      </aside>

      <section className="record-card panel-card-soft" style={{ gridColumn: "1 / -1" }}>
        <div className="record-card__header">
          <div>
            <h2>Generated artifacts</h2>
            <p className="section-copy section-copy-soft">Stored HR letters attached to employee records.</p>
          </div>
          <div className="record-card__eyebrow">
            <span className="record-chip">{initialLetters.length} visible</span>
          </div>
        </div>
        <div className="queue-list">
          {initialLetters.map((item) => (
            <article className="record-card panel-card-soft" key={item.id}>
              <div className="record-card__header">
                <div>
                  <h2>{item.title}</h2>
                  <p className="section-copy section-copy-soft">{item.employee_name} ({item.employee_code})</p>
                </div>
                <div className="record-card__actions">
                  {item.artifact_id ? <a className="button button--ghost" href={`/api/hr-admin/generated-letters/${item.id}/download`}>Download</a> : null}
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Type</span><span className="detail-value">{item.letter_type}</span></div>
                <div className="detail-row"><span className="detail-label">Template</span><span className="detail-value">{item.template_code || "Manual"}</span></div>
                <div className="detail-row"><span className="detail-label">Issue date</span><span className="detail-value">{item.issue_date || "Not set"}</span></div>
                <div className="detail-row"><span className="detail-label">Workflow</span><span className="detail-value">{item.workflow_reference || "Not linked"}</span></div>
                <div className="detail-row"><span className="detail-label">File</span><span className="detail-value">{item.file_name || "Pending"}</span></div>
                <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value">{item.status}</span></div>
              </div>
            </article>
          ))}
          {initialLetters.length === 0 ? (
            <div className="empty-state">
              <strong>No generated letters found.</strong>
              <span className="muted">Use the generator to create the first stored employee artifact.</span>
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
